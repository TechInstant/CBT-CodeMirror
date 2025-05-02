// src/components/Editor.tsx
import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { material } from "@uiw/codemirror-theme-material";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { loadPyodide } from "pyodide";
import { formatString } from "../components/FormatString";
import { StudentQuestion, useQuestions } from "../Context/QuestionContext";
import { FaSpinner } from "react-icons/fa";
import { gradeWithGroqAI } from "../components/AutoGrade";
import { saveSubmissionToFirebase } from "../saveScores";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const Editor: React.FC = () => {
  /*** 1) Code + console state ***/
  const [code, setCode] = useState("print('Hello, World!')");
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(false);

  /*** 2) Pyodide ***/
  const [pyodide, setPyodide] = useState<any>(null);
  useEffect(() => {
    loadPyodide().then((py) => {
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
    });
  }, []);

  /*** 3) Theme & language ***/
  const themeMap = { "one-dark": oneDark, material, dracula };
  const languageMap = { python: python(), javascript: javascript() };
  const [theme, setTheme] = useState(oneDark);
  const [language, setLanguage] = useState(python());

  /*** 4) Questions from context ***/
  const {
    questions,
    loading: questionsLoading,
    studentQuestions,
    fetchAndAssignRandomQuestions,
  } = useQuestions();
  const studentLoading = questionsLoading || studentQuestions.length === 0;

  /*** 5) Pagination ***/
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = localStorage.getItem("currentQuestionIndex");
    return saved ? +saved : 0;
  });
  useEffect(() => {
    localStorage.setItem("currentQuestionIndex", String(currentIndex));
  }, [currentIndex]);

  /*** 6) Timer ***/
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

  /*** 7) Per-question code/output maps ***/
  const [questionCodeMap, setQuestionCodeMap] = useState<Record<string, string>>({});
  const [questionOutputMap, setQuestionOutputMap] = useState<Record<string, string>>({});

  // pull out current question
  const currentQuestion: StudentQuestion = studentQuestions[currentIndex]!;
  const questionId = currentQuestion?.QuestionsId;
  const questionText = currentQuestion?.questionText || "";

  /*** 8) Snapshot only when user switches questions ***/
  useEffect(() => {
    if (!questionId) return;
    setQuestionCodeMap((m) => ({ ...m, [questionId]: code }));
    setQuestionOutputMap((m) => ({ ...m, [questionId]: consoleOutput }));
  }, [currentIndex, questionId]);

  /*** 9) Restore on initial load ***/
  useEffect(() => {
    if (!studentQuestions.length) return;
    const firstId = studentQuestions[0].QuestionsId;
    setCurrentIndex(0);
    setCode(questionCodeMap[firstId] ?? "print('Hello, World!')");
    setConsoleOutput(questionOutputMap[firstId] ?? "");
  }, [studentQuestions]);

  
 /*** 10) Run code (wrapped for interactive input) ***/
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

  /*** 11) Submit ***/
  const [hasSubmitted, setHasSubmitted] = useState(false);
  async function handleSubmit() {
    // merge latest pane
    const codeMap = { ...questionCodeMap, [questionId]: code };
    const outMap = { ...questionOutputMap, [questionId]: consoleOutput };

    // sanitize studentId
    const user = JSON.parse(localStorage.getItem("userData") || "{}");
    const rawId = user.StudentId || user.MatricNumber || "";
    const studentId = rawId.replace(/\//g, "_");
    const studentName = `${user.FirstName || ""} ${user.LastName || ""}`.trim();

    // grade all
    const responses = await Promise.all(
      studentQuestions.map(async ({ QuestionsId: qid, questionText: qt }) => {
        const sc = codeMap[qid] ?? "";
        const so = outMap[qid] ?? "";
        let score = 0;
        try {
          score = await gradeWithGroqAI(sc, so, qt);
        } catch (e) {
          console.warn("Grading error:", e);
        }
        return { QuestionsId: qid, questionText: qt, code: sc, output: so, score, totalScore: 10 };
      })
    );

    const payload = { studentId, studentName, timestamp: new Date().toISOString(), responses };
    // strip undefined
    const clean = JSON.parse(JSON.stringify(payload));
    const ok = await saveSubmissionToFirebase(clean);
    if (ok) {
      toast.success("Submitted successfully!", { autoClose: 2000 });
      setHasSubmitted(true);
      ["examTimeLeft", "assignedQuestions", "currentQuestionIndex", "userData"].forEach((k) =>
        localStorage.removeItem(k)
      );
      setTimeout(() => (window.location.href = "/"), 5000);
    } else {
      toast.error("Error saving submission.");
    }
  }

  /*** 12) Clear console ***/
  const handleClearConsole = () => setConsoleOutput("");

  /*** 13) Render ***/
  return (
    <div className="h-screen flex flex-col">
      {/* header */}
      <div className="bg-blue-600 text-white p-3 text-center font-bold relative">
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
      <div className="flex flex-1">
        {/* sidebar */}
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <h2 className="font-bold">Question {currentIndex + 1}</h2>
          <div className="mt-2">
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
        <div className="w-2/3 p-4 flex flex-col bg-white border-l">
          {/* controls */}
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
          <CodeMirror value={code} height="300px" extensions={[language]} theme={theme} onChange={setCode} />

          {consoleOpen && (
            <div className="mt-4 bg-black text-white p-2 h-40 overflow-auto">
              <div className="flex justify-between mb-1">
                <strong>Console Output</strong>
                <button onClick={handleClearConsole}>Clear</button>
                <button onClick={() => setConsoleOpen(false)}>Hide</button>
              </div>
              <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
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
