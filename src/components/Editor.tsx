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
// import { formatString } from "../components/FormatString"; 
import { useQuestions } from "../Context/QuestionContext";
import { FaSpinner } from "react-icons/fa";

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
  const isFetched = useRef(false);
  // const { studentQuestions, fetchAndAssignRandomQuestions } = useQuestions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { questions, studentQuestions, fetchAndAssignRandomQuestions } = useQuestions();

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
        console.error("Failed to load Pyodide:", error);
      }
    };
    loadPython();
  }, []);

  useEffect(() => {
    if (!timerStarted && questions.length > 0) {
      const examDurationInMinutes = questions[0].Duration; 
      if (examDurationInMinutes) {
        setTimeLeft(examDurationInMinutes * 60);
        setTimerStarted(true);
      }
    }
  }, [questions, timerStarted]);

  // Countdown timer effect.
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => (prev ?? 0) - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);


  useEffect(() => {
    if (isFetched.current) return;
    // let activeQuestionId = localStorage.getItem("activeQuestionId");

    const activeQuestionId = localStorage.getItem("activeQuestionId");
    if (activeQuestionId) {
      fetchAndAssignRandomQuestions(activeQuestionId);
    } else {
      console.error("Active question document ID not found in localStorage.");
    }
    isFetched.current = true;
  }, [fetchAndAssignRandomQuestions]);

  

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) handleSubmit(); 
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => (prev ?? 0) - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);
  

  const handleRunCode = async () => {
    setConsoleOpen(true);
    if (!pyodide) {
      setConsoleOutput("Python runtime is still loading...");
      return;
    }
    try {
      const result = await pyodide.runPythonAsync(code);
      setConsoleOutput((prev) => prev + "\n" + result);
    } catch (error) {
      setConsoleOutput((prev) => prev + `\nError: ${error}`);
    }
  };

  const handleSubmit = () => {
    toast.success("Code submitted successfully!", { position: "top-right", autoClose: 3000 });
    localStorage.removeItem("assignedQuestion");
    localStorage.removeItem("userData");
    setTimeout(() => { window.location.href = "/"; }, 3500);
  };
  const handleClearConsole = () => {
    setConsoleOutput("");
  };

  useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      toast.error("You left the page. Test auto-submitted.", { autoClose: 2000 });
      handleSubmit(); // Auto-submit and redirect
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, []);


  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopyCutPaste = (e: ClipboardEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "x", "v", "u", "s", "a"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("Screenshots are disabled.");
      }
    };
  
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);
    document.addEventListener("keydown", handleKeyDown);
  
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  

  return (
    <div className="h-screen flex flex-col">
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center relative">
        Code Editor
        <div className="absolute right-4 top-2 text-white font-bold text-lg">🕒 Time Left: {timeLeft !== null ? formatTime(timeLeft) : <FaSpinner className="animate-spin text-2xl" />}</div>
      </div>
      <ToastContainer />
      <div className="flex flex-1">
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
        <p className="text-lg font-bold">Question {currentIndex + 1}</p>
        <div>
        {studentQuestions[currentIndex] ? (
    typeof studentQuestions[currentIndex] === "object" &&
    studentQuestions[currentIndex] !== null &&
    "questionText" in studentQuestions[currentIndex] ? (
      (studentQuestions[currentIndex] as { questionText: string }).questionText
    ) : (
      studentQuestions[currentIndex]
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
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={currentIndex >= studentQuestions.length - 1}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
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
        <button onClick={handleRunCode} className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500">Run Code</button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Submit</button>  
      </div>
    </div>
  );
};

export default CodeSection;
