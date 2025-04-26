import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { python } from "@codemirror/lang-python";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { material } from "@uiw/codemirror-theme-material";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { loadPyodide } from "pyodide";
import { formatString } from "../components/FormatString"; 
import { useQuestions } from "../Context/QuestionContext";
import { FaSpinner } from "react-icons/fa";
import { gradeWithGroqAI } from "../components/AutoGrade";
import { saveSubmissionToFirebase } from "../saveScores";


const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};


const CodeSection: React.FC = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [code, setCode] = useState<string>("print('Hello, World!')");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [theme, setTheme] = useState(oneDark);
  const [language, setLanguage] = useState(python());
  const [pyodide, setPyodide] = useState<any>(null);
  const themeMap = { "one-dark": oneDark, material, dracula };
  const languageMap = { python: python(), javascript: javascript() };
  const { questions, studentQuestions, fetchAndAssignRandomQuestions } = useQuestions();
   const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("currentQuestionIndex");
    return saved ? +saved : 0;
  });
  const [questionCodeMap, setQuestionCodeMap] = useState<{ [questionId: string]: string }>({});
  const [questionOutputMap, setQuestionOutputMap] = useState<{ [questionId: string]: string }>({});  
  const [hasSubmitted, setHasSubmitted] = useState(false);

  

  useEffect(() => {
    localStorage.setItem("currentQuestionIndex", String(currentIndex));
  }, [currentIndex]);



  useEffect(() => {
    const loadPython = async () => {
      try {
        const pyInstance = await loadPyodide();
  
        // Redirect stdout and stderr
        pyInstance.setStdout({
          batched: (text: string) => setConsoleOutput((prev) => prev + "\n" + text),
        });
        pyInstance.setStderr({
          batched: (output: string) => setConsoleOutput((prev) => prev + "\nError: " + output),
        }); 
        // Override `input()` to use browser prompt
        pyInstance.runPython(`
          import builtins
          from js import prompt

          def browser_input(prompt_text=""):
              response = prompt(str(prompt_text))  # Convert to string in case it's not
              if response is None:
                  raise EOFError("No input provided.")
              return response

          builtins.input = browser_input
        `);
  
        setPyodide(pyInstance);
      } catch (error) {
        console.log("Failed to load Pyodide:", error);
      }
    };
    loadPython();
  }, []);

   const firstFetch = useRef(false);
   useEffect(() => {
     if (firstFetch.current) return;
     const activeId = localStorage.getItem("activeQuestionId");
     if (activeId) {
       if (!localStorage.getItem("assignedQuestions")) {
         fetchAndAssignRandomQuestions(activeId);
       }
       const saved = localStorage.getItem("examTimeLeft");
       if (saved) {
         setTimeLeft(+saved);
       }
     }
     firstFetch.current = true;
   }, [fetchAndAssignRandomQuestions]);
 
   useEffect(() => {
     if (timerStarted) return;
     if (timeLeft == null && questions.length) {
       const durationMins = questions.find(q => 
         q.questionId === localStorage.getItem("activeQuestionId")
       )?.Duration;
       if (durationMins) {
         const secs = durationMins * 60;
         setTimeLeft(secs);
         localStorage.setItem("examTimeLeft", String(secs));
         setTimerStarted(true);
       }
     }
   }, [questions, timerStarted, timeLeft]);
 
   useEffect(() => {
     if (!timerStarted || timeLeft == null) return;
     if (timeLeft <= 0) {
       handleSubmit();
       return;
     }
     const id = setInterval(() => {
       setTimeLeft(prev => {
         const nxt = (prev ?? 0) - 1;
         localStorage.setItem("examTimeLeft", String(nxt));
         return nxt;
       });
     }, 1000);
     return () => clearInterval(id);
   }, [timerStarted, timeLeft]);

  // useEffect(() => {
  //   const onVis = () => {
  //     if (document.hidden) {
  //       toast.error("Switched tab—auto-submitting.", { autoClose: 2000 });
  //       handleSubmit();
  //     }
  //   };
  //   document.addEventListener("visibilitychange", onVis);
  //   return () => document.removeEventListener("visibilitychange", onVis);
  // }, []);
  

  const handleRunCode = async () => {
    setConsoleOpen(true);
  
    if (!pyodide) {
      setConsoleOutput(" Python runtime is still loading...");
      return;
    }
  
    try {
      await pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        sys.stdout = StringIO()
        sys.stderr = sys.stdout  # To also capture errors
        `);
        
      await pyodide.runPythonAsync(code);
  
      const newOutput = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      
      setConsoleOutput(newOutput || "Code ran successfully, but no output.");
      
      setQuestionOutputMap((prev) => ({
        ...prev,
        [questionId]: newOutput,
      }));
    } catch (error) {
      const errOutput = `Error: ${error}`;
      
      setConsoleOutput(errOutput);
      
      setQuestionOutputMap((prev) => ({
        ...prev,
        [questionId]: errOutput,
      }));
    }
  };
  
  const currentQuestion = studentQuestions[currentIndex];
  const questionId =
  typeof currentQuestion === "object" &&
  currentQuestion !== null &&
  "questionId" in currentQuestion
    ? currentQuestion.questionId
    : localStorage.getItem("activeQuestionId") ?? "unknown";

    async function handleSubmit() {
      try {
        const userData = JSON.parse(localStorage.getItem("userData") || "{}");
        const studentId = userData.StudentId || userData.MatricNumber;
        const studentName = `${userData.FirstName ?? ""} ${userData.LastName ?? ""}`.trim();
  
        const updatedCodeMap = {
          ...questionCodeMap,
          [questionId]: code,
        };
        const updatedOutputMap = {
          ...questionOutputMap,
          [questionId]: consoleOutput,
        };
        
        setQuestionCodeMap(updatedCodeMap);
        setQuestionOutputMap(updatedOutputMap);
        
  
        await new Promise((res) => setTimeout(res, 100));
  
        const submissionArray = await Promise.all(
          studentQuestions.map(async (question: any) => {
            const qId = question.questionId;
            const qText = question.questionText;
            const code = updatedCodeMap[qId] ?? "";
            const output = updatedOutputMap[qId] ?? "";
        
            let score = 0;
            if (!code.trim() || output.includes("still loading")) {
              return {
                questionId: qId,
                questionText: qText,
                code,
                output,
                score,
                totalScore: 100,
              };
            }
        
            try {
              score = await gradeWithGroqAI(code, output, qText);
            } catch (err) {
              console.log("Grading error for question", qId, err);
            }
        
            return {
              questionId: qId,
              questionText: qText,
              code,
              output,
              score,
              totalScore: 100,
            };
          })
        );
        
  
        const submissionData = {
          studentId,
          studentName,
          timestamp: new Date().toISOString(),
          responses: submissionArray,
        };
  
        const success = await saveSubmissionToFirebase(submissionData);
  
        if (success) {
          toast.success("All questions submitted successfully!", { autoClose: 2000 });
          setHasSubmitted(true);
        } else {
          toast.error("Error saving submission.");
        }
  
        ["examTimeLeft", "assignedQuestions", "currentQuestionIndex", "userData"].forEach((k) =>
          localStorage.removeItem(k)
        );
  
        setTimeout(() => (window.location.href = "/"), 2500);
      } catch (err) {
        console.error(err);
        toast.error("Error during submission.");
      }
    }
    

  const handleClearConsole = () => {
    setConsoleOutput("");
  };




  // useEffect(() => {
  //   const handleContextMenu = (e: MouseEvent) => e.preventDefault();
  //   const handleCopyCutPaste = (e: ClipboardEvent) => e.preventDefault();
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (
  //       (e.ctrlKey || e.metaKey) &&
  //       ["c", "x", "v", "u", "s", "a"].includes(e.key.toLowerCase())
  //     ) {
  //       e.preventDefault();
  //     }
  //     if (e.key === "PrintScreen") {
  //       navigator.clipboard.writeText("Screenshots are disabled.");
  //     }
  //   };
  
  //   document.addEventListener("contextmenu", handleContextMenu);
  //   document.addEventListener("copy", handleCopyCutPaste);
  //   document.addEventListener("cut", handleCopyCutPaste);
  //   document.addEventListener("paste", handleCopyCutPaste);
  //   document.addEventListener("keydown", handleKeyDown);
  
  //   return () => {
  //     document.removeEventListener("contextmenu", handleContextMenu);
  //     document.removeEventListener("copy", handleCopyCutPaste);
  //     document.removeEventListener("cut", handleCopyCutPaste);
  //     document.removeEventListener("paste", handleCopyCutPaste);
  //     document.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, []);
  
  const handleQuestionChange = (newIndex: number) => {
    setQuestionCodeMap((prev) => ({
      ...prev,
      [questionId]: code,
    }));
    setQuestionOutputMap((prev) => ({
      ...prev,
      [questionId]: consoleOutput,
    }));
    const nextQuestion = studentQuestions[newIndex];
    const nextId = typeof nextQuestion === "object" && nextQuestion !== null && "questionId" in nextQuestion
      ? nextQuestion.questionId
      : "unknown";
  
    setCode(questionCodeMap[nextId] ?? "");
    setConsoleOutput(questionOutputMap[nextId] ?? "");
    setCurrentIndex(newIndex);
  };  

  return (
    <div className="h-screen flex flex-col">
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center relative">
        Code Editor
        <div
          className={`absolute right-4 top-2 font-mono text-lg ${
            (timeLeft ?? 0) <= 15 * 60 ? "text-red-400" : "text-white"
          }`}
        >
          🕒 Time Left: {timeLeft !== null ? formatTime(timeLeft) : 
          <FaSpinner className="animate-spin text-2xl" />}
          </div>
      </div>
      <ToastContainer />
      <div className="flex flex-1">
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
        <p className="text-lg font-bold">Question {currentIndex + 1}</p>
        <div>

        {studentQuestions[currentIndex] ? (
          formatString(
            typeof studentQuestions[currentIndex] === "object" &&
            studentQuestions[currentIndex] !== null &&
            "questionText" in studentQuestions[currentIndex]
              ? (studentQuestions[currentIndex] as { questionText: string }).questionText
              : studentQuestions[currentIndex] as string
          )
        ) : (
  
          <div className="flex items-center justify-center">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        )}
        </div>
        {studentQuestions.length > 1 && (
            <div className="mt-4 flex justify-between">
              <button
                disabled={currentIndex === 0}
                onClick={() => handleQuestionChange(currentIndex - 1)}
                className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentIndex >= studentQuestions.length - 1}
                onClick={() => handleQuestionChange(currentIndex + 1)}
                className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
      </div>
      
        <div className="w-2/3 p-4 bg-white border-l flex flex-col">
          <div className="mb-4 flex space-x-4">
            <select onChange={(e) => setTheme(themeMap[e.target.value as keyof typeof themeMap])}>{Object.keys(themeMap).map((theme) => (<option key={theme} value={theme}>{theme}</option>))}</select>
            <select onChange={(e) => setLanguage(languageMap[e.target.value as keyof typeof languageMap])}>{Object.keys(languageMap).map((lang) => (<option key={lang} value={lang}>{lang}</option>))}</select>
          </div>
          <CodeMirror value={code} height="300px" extensions={[language]} theme={theme} onChange={setCode} />
          {consoleOpen && (
            <div className="mt-4">
              <div className="w-full bg-black text-white h-40 overflow-auto flex justify-between">
                <div className="flex-1 p-2">
                  <p className="text-lg font-bold mb-2">Console Output:</p>
                  <pre>{consoleOutput}</pre>
                </div>
              <div className="">
                <button onClick={handleClearConsole} className="px-2 py-1  text-white rounded-md hover:bg-gray-500">Clear</button>
                <button onClick={() => setConsoleOpen(!consoleOpen)} className="px-2 py-1  text-white rounded-md hover:bg-gray-500">Hide</button>
              </div>
              </div>
            </div>
          )}        
          </div>
      </div>
      <div className="flex justify-end space-x-4 p-4">
        <button 
        disabled={!pyodide}
        onClick={handleRunCode} 
        className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500">
          {pyodide ? "Run Code" : "Loading Python..."}
          </button>
        <button
              onClick={handleSubmit}
              disabled={hasSubmitted}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Submit
        </button> 
      </div>
    </div>
  );
};

export default CodeSection;
