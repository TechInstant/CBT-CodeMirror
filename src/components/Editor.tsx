import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { material } from "@uiw/codemirror-theme-material";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { formatString } from "../components/FormatString";
import { StudentQuestion, useQuestions } from "../Context/QuestionContext";
import { FaSpinner } from "react-icons/fa";
import { gradeWithGroqAI } from "../components/AutoGrade";
import { baseUrl, GetToken } from "../App";
import axios from "axios";
// import { loadPyodide } from "pyodide";


interface SubmissionRequest {
  studentId: string;
  studentName: string;
  department: string;
  timestamp: string;
  responses: {
    QuestionsId: string;
    questionText: string;
    code: string;
    output: string;
    score: number;
    totalScore: number;
  }[];
}


const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.4/full/";
// helper to dynamically load the Pyodide script if needed
function ensurePyodideScript(): Promise<void> {
  if ((window as any).loadPyodide) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error(`Failed to load Pyodide script: ${e}`));
    document.head.appendChild(script);
  });
}

const noClipboard = EditorView.domEventHandlers({
  copy: (e) => { e.preventDefault(); return true; },
  cut:  (e) => { e.preventDefault(); return true; },
  paste:(e) => { e.preventDefault(); return true; }
});

const Editor: React.FC = () => {
  const [code, setCode] = useState("print('Hello, World!')");
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(false);

  const [pyodide, setPyodide] = useState<any>(null);
  const isUnloading = useRef(false);
  
  useEffect(() => {
    let mounted = true;

    ensurePyodideScript()
    .then(() =>
      // @ts-ignore: now loadPyodide is on window
      (window as any).loadPyodide({
        indexURL: PYODIDE_CDN
      })
    )
    .then((py: any) => {
      if (!mounted) return;
      py.setStdout({ batched: (t: string) => setConsoleOutput((o) => o + "\n" + t) });
      py.setStderr({ batched: (e: string) => setConsoleOutput((o) => o + "\nError: " + e) });
      py.runPython(`
import builtins
from js import prompt
def browser_input(prompt_text=""):
    response = prompt(str(prompt_text))
    if response is None: raise EOFError()
    return response
builtins.input = browser_input
      `);
      setPyodide(py);
    })
    .catch(err => {
      console.error(err);
      setConsoleOutput("Failed to load Python runtime.");
    });

  return () => {
    mounted = false;
  };
  }, []);

 
  const themeMap = { "one-dark": oneDark, material, dracula };
  const languageMap = { python: python(), javascript: javascript() };
  const [theme, setTheme] = useState(oneDark);
  const [language, setLanguage] = useState(python());

  const {
    questions,
    loading: questionsLoading,
    studentQuestions,
    fetchAndAssignRandomQuestions,
  } = useQuestions();
  const studentLoading = questionsLoading || studentQuestions.length === 0;

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("currentQuestionIndex");
    return saved ? +saved : 0;
  });
  useEffect(() => {
    localStorage.setItem("currentQuestionIndex", String(currentIndex));
  }, [currentIndex]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const firstLoad = useRef(false);

  // fetch & restore
  useEffect(() => {
    if (firstLoad.current) return;
    const activeId = localStorage.getItem("activeQuestionsId");
    if (activeId && !localStorage.getItem("assignedQuestions")) {
      fetchAndAssignRandomQuestions(activeId);
    }
    const saved = localStorage.getItem("examTimeLeft");
    if (saved) {
      setTimeLeft(+saved);
      setTimerStarted(true);
    }
    firstLoad.current = true;
  }, [fetchAndAssignRandomQuestions]);

  useEffect(() => {
    if (timerStarted) return;
    if (questionsLoading || studentQuestions.length === 0) return;
    const activeId = localStorage.getItem("activeQuestionsId")!;
    const exam = questions.find((q) => q.QuestionsId === activeId);
    if (!exam) return;
    const secs = exam.Duration * 60;
    setTimeLeft(secs);
    setTimerStarted(true);
    localStorage.setItem("examTimeLeft", String(secs));
  }, [questionsLoading, questions, studentQuestions, timerStarted]);

  useEffect(() => {
    if (!timerStarted || timeLeft == null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        const nxt = (t ?? 0) - 1;
        localStorage.setItem("examTimeLeft", String(nxt));
        return nxt;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [timerStarted, timeLeft]);

  const [questionCodeMap, setQuestionCodeMap] = useState<Record<string, string>>({});
  const [questionOutputMap, setQuestionOutputMap] = useState<Record<string, string>>({});

  // pull out current question
  const currentQuestion: StudentQuestion = studentQuestions[currentIndex]!;
  const questionId = currentQuestion?.QuestionsId;
  const questionText = currentQuestion?.questionText || "";

  useEffect(() => {
    if (!questionId) return;
    setQuestionCodeMap((m) => ({ ...m, [questionId]: code }));
    setQuestionOutputMap((m) => ({ ...m, [questionId]: consoleOutput }));
  }, [currentIndex, questionId]);

  useEffect(() => {
    if (!studentQuestions.length) return;
    const firstId = studentQuestions[0].QuestionsId;
    setCurrentIndex(0);
    setCode(questionCodeMap[firstId] ?? "print('Hello, World!')");
    setConsoleOutput(questionOutputMap[firstId] ?? "");
  }, [studentQuestions]);

  
const handleRunCode = async () => {
  setConsoleOpen(true);
  if (!pyodide) {
    setConsoleOutput("Python still loading...");
    return;
  }

  // Wrap student code to funnel stdout+stderr through StringIO,
  // but leave input() intact so prompt() works repeatedly.
  const wrapped = `
import sys
from io import StringIO

# redirect stdout+stderr
old_out, old_err = sys.stdout, sys.stderr
sys.stdout = StringIO()
sys.stderr = sys.stdout

try:
${code.split("\n").map((l) => "    " + l).join("\n")}
except EOFError:
    print("\\n[Input cancelled, continuing]")
except Exception as e:
    print("Error:", e)

# grab everything
output = sys.stdout.getvalue()

# restore
sys.stdout, sys.stderr = old_out, old_err
output
`;

  try {
    const result: string = await pyodide.runPythonAsync(wrapped);
    setConsoleOutput(result);
    setQuestionCodeMap((m) => ({ ...m, [questionId]: code }));
    setQuestionOutputMap((m) => ({ ...m, [questionId]: result }));
  } catch (err) {
    const e = String(err);
    setConsoleOutput(e);
    setQuestionOutputMap((m) => ({ ...m, [questionId]: e }));
  }
};

// 2) tab-switch vs reload/close
useEffect(() => {
  const onBeforeUnload = () => { isUnloading.current = true; };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden" && !isUnloading.current) {
      handleSubmit();
    }
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.removeEventListener("beforeunload", onBeforeUnload);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, []);


  const [hasSubmitted, setHasSubmitted] = useState(false);
  async function handleSubmit() {
    const codeMap = { ...questionCodeMap, [questionId]: code };
    const outMap  = { ...questionOutputMap, [questionId]: consoleOutput };
  
    const responses = await Promise.all(
      studentQuestions.map(async ({ QuestionsId: qid, questionText: qt }) => {
        const sc = codeMap[qid] ?? "";
        const so = outMap[qid]  ?? "";
        let score = 0;
        try {
          score = await gradeWithGroqAI(sc, so, qt);
        } catch (e) {
          console.warn("Grading failed for", qid, e);
        }
        return {
          QuestionsId:  qid,
          questionText: qt,
          code:         sc,
          output:       so,
          score,
          totalScore:  10,
        };
      })
    );
  
    const user     = JSON.parse(localStorage.getItem("userData") || "{}");
    const rawId    = user.StudentId || user.MatricNumber || "";
    const studentId= rawId.replace(/\//g, "_");
    const studentName = `${user.FirstName || ""} ${user.LastName || ""}`.trim();
    const department = user.Department || user.DepartmentName || "";

  

    const payload: SubmissionRequest = {
      studentId,
      studentName,
      department,
      timestamp: new Date().toISOString(),
      responses,
    };
  
    try {
      const idToken = await GetToken();
      await axios.post(
        `${baseUrl}/submissions`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Submitted successfully!", { autoClose: 2000 });
      setHasSubmitted(true);

      ["examTimeLeft", "assignedQuestions", "currentQuestionIndex", "userData"]
        .forEach(k => localStorage.removeItem(k));
      setTimeout(() => (window.location.href = "/"), 3000);
  
    } catch (err: any) {
      if (err.response) {
        const { status, data } = err.response;
        if (status === 429 && data.redirect) {
          toast.error(data.message, { autoClose: 2000 });
          setTimeout(() => {
            window.location.href = data.redirect;
          }, 2000);
          return;
        }

        console.error("Submission failed:", data);
        toast.error("Submission error: " + (data.message || err.response.statusText));
      } else {
        console.error("Network error while submitting:", err);
        toast.error("Network error—please try again.");
      }
    }
  }

  const handleClearConsole = () => setConsoleOutput("");

  return (
    <div className="h-screen flex flex-col">
      {/* header */}
      <div className="bg-blue-600 text-white p-3 text-center font-bold text-lg sm:text-xl relative">
        Code Editor
        <span
   className={
      "absolute right-4 top-1 font-mono transition-colors " +
      (timeLeft != null && timeLeft <= 15 * 60
        ? "text-red-600"
        : "text-white")
    }
  >
    🕒{" "}
    {timeLeft != null
      ? formatTime(timeLeft)
      : <FaSpinner className="inline-block animate-spin" />}
  </span>
      </div>
      <ToastContainer />

      {/* body */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* sidebar */}
        <div className="w-full md:w-1/3 p-4 bg-gray-100 overflow-auto">
          <h2 className="font-bold">Question {currentIndex + 1}</h2>
          <div className="mt-2 whitespace-pre-wrap">
            {studentLoading ? (
              <div className="flex items-center justify-center h-20">
                <FaSpinner className="animate-spin text-3xl text-blue-600" />
              </div>
            ) : (
              formatString(questionText)
            )}
          </div>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentIndex((i) => Math.min(studentQuestions.length - 1, i + 1))}
              disabled={currentIndex >= studentQuestions.length - 1}
              className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* editor + console */}
        <div className="w-full md:w-2/3 flex flex-col p-4 overflow-hidden">
          <div className="mb-4 flex space-x-4">
            <select onChange={(e) => setTheme(themeMap[e.target.value as keyof typeof themeMap])}>
              {Object.keys(themeMap).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select onChange={(e) => setLanguage(languageMap[e.target.value as keyof typeof languageMap])}>
              {Object.keys(languageMap).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-hidden border rounded">
          <CodeMirror 
          value={code} 
          height="300px" 
          extensions={[language, noClipboard]} 
          theme={theme} 
          onChange={setCode} />
          </div>
          {consoleOpen && (
            <div className="mt-2 bg-black text-white p-2 h-40 overflow-auto rounded font-mono text-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <p className="text-lg font-semibold">Console Output:</p>
                <div className="space-x-2">
                  <button
                    onClick={handleClearConsole}
                    className="px-2 py-1 text-sm text-red-500 hover:underline hover:bg-gray-700 rounded"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setConsoleOpen(!consoleOpen)}
                    className="px-2 py-1 text-white hover:bg-gray-700 rounded"
                  >
                    Hide
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto">{consoleOutput}</pre>
            </div>
          )}

        </div>
      </div>

      {/* footer */}
      <div className="p-4 flex justify-end space-x-4 bg-white border-t">
        <button
          disabled={!pyodide}
          onClick={handleRunCode}
          className="px-4 py-2 bg-gray-400 text-white rounded disabled:opacity-50"
        >
          {pyodide ? "Run Code" : "Loading Python..."}
        </button>
        <button
          onClick={handleSubmit}
          disabled={hasSubmitted}
          className={`px-4 py-2 text-white rounded ${
            hasSubmitted ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {hasSubmitted ? "Submitted" : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default Editor;
