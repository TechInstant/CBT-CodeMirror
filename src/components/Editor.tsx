import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { baseUrl, GetToken } from "../App";
import axios from "axios";
// import { loadPyodide } from "pyodide";


interface AttemptTelemetry {
  startedAt: string;
  durationSeconds: number;
  runCounts: Record<string, number>;
  tabSwitchCount: number;
  // Clipboard use is allowed. Counted so the analysis can see how much pasting
  // occurred, rather than inferring it from a restriction that no longer exists.
  clipboardCounts: { copy: number; cut: number; paste: number };
  submitReason: "manual" | "timer" | "tab-switch";
  userAgent: string;
}

interface SubmissionRequest {
  studentId: string;
  studentName: string;
  department: string;
  timestamp: string;
  paperId: string;
  language: string;
  // Scores are assigned server-side. The client sends the work, not the marks.
  responses: {
    QuestionsId: string;
    questionText: string;
    code: string;
    output: string;
    totalScore: number;
  }[];
  telemetry: AttemptTelemetry;
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

/*
  Clipboard use is allowed, so students can copy the question text into their
  answer and paste code they are drafting.

  Every event is still counted. The restriction being lifted is exactly why the
  measurement matters: an invigilator, and later the analysis, can see how much
  pasting happened per attempt rather than assuming it did not. Counting without
  blocking keeps the behaviour observable instead of merely forbidden.
*/
const countClipboard = (onClipboard: (kind: "copy" | "cut" | "paste") => void) =>
  EditorView.domEventHandlers({
    copy: () => { onClipboard("copy"); return false; },
    cut: () => { onClipboard("cut"); return false; },
    paste: () => { onClipboard("paste"); return false; },
  });

const STARTER_CODE: Record<string, string> = {
  python: "print('Hello, World!')",
  javascript: "console.log('Hello, World!');",
};
const isStarter = (s: string) =>
  Object.values(STARTER_CODE).includes(s.trim());

const Editor: React.FC = () => {
  const [code, setCode] = useState(STARTER_CODE.python);
  const [consoleOutput, setConsoleOutput] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(false);

  const [pyodide, setPyodide] = useState<any>(null);
  const isUnloading = useRef(false);

  // Behavioural signals sent with the attempt. Refs, not state, so the auto-submit
  // handlers read live values instead of whatever was current when they mounted.
  const startedAtRef = useRef<string>(
    localStorage.getItem("examStartedAt") ?? new Date().toISOString()
  );
  const runCountsRef = useRef<Record<string, number>>({});
  const tabSwitchCountRef = useRef(0);
  // Clipboard use is permitted; these record it rather than prevent it.
  const clipboardCountsRef = useRef({ copy: 0, cut: 0, paste: 0 });

  useEffect(() => {
    localStorage.setItem("examStartedAt", startedAtRef.current);
  }, []);

  const clipboardGuard = useRef(
    countClipboard((kind) => { clipboardCountsRef.current[kind] += 1; })
  ).current;

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
  type ThemeName = keyof typeof themeMap;
  type LanguageName = keyof typeof languageMap;

  /*
    The theme select was uncontrolled — no value bound — so it always showed the
    first option regardless of what was selected. It is a personal preference,
    so it stays a student choice and is remembered between sessions.

    The language is not a student choice: the admin sets it on the paper, and the
    editor follows. Letting students pick it meant a cohort could be answering
    the same paper in different languages, and the Run button executed Python
    either way.
  */
  const [themeName, setThemeName] = useState<ThemeName>(
    () => (localStorage.getItem("editorTheme") as ThemeName) || "one-dark"
  );
  useEffect(() => {
    localStorage.setItem("editorTheme", themeName);
  }, [themeName]);

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
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const firstLoad = useRef(false);

  // The paper being sat. Falls back to whichever document the server marks
  // active, so a student whose localStorage is empty still gets an exam instead
  // of an endless spinner.
  const activePaper = useMemo(() => {
    const activeId = localStorage.getItem("activeQuestionsId");
    return (
      questions.find((q) => q.QuestionsId === activeId) ??
      questions.find((q) => q.isActive)
    );
  }, [questions]);

  // fetch & restore
  useEffect(() => {
    if (firstLoad.current) return;
    const activeId = localStorage.getItem("activeQuestionsId");
    if (activeId && !localStorage.getItem("assignedQuestions")) {
      fetchAndAssignRandomQuestions(activeId);
    }
    firstLoad.current = true;
  }, [fetchAndAssignRandomQuestions]);

  /*
    The deadline is an absolute timestamp, not a counter that ticks down.

    Previously the remaining seconds were decremented once per second and saved
    to localStorage, which meant the clock only advanced while the tab was open:
    closing the tab, sleeping the machine or killing the browser paused the exam,
    and a student could reopen later with their time intact. Deriving the
    remaining time from a fixed end instant closes that, and survives a reload.

    It is also keyed to the paper, so a leftover deadline from an earlier sitting
    is discarded rather than applied to the next one.
  */
  useEffect(() => {
    if (endsAt !== null || !activePaper) return;

    const storedPaper = localStorage.getItem("examPaperId");
    const storedEnd = Number(localStorage.getItem("examEndsAt") ?? 0);

    if (storedPaper === activePaper.QuestionsId && storedEnd > 0) {
      setEndsAt(storedEnd);
      return;
    }

    const deadline = Date.now() + activePaper.Duration * 60_000;
    localStorage.setItem("examEndsAt", String(deadline));
    localStorage.setItem("examPaperId", activePaper.QuestionsId);
    setEndsAt(deadline);
  }, [activePaper, endsAt]);

  // One interval for the life of the deadline. The old effect listed timeLeft as
  // a dependency, so it tore down and rebuilt the interval every single second.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt]);

  // Only the code map is state: the question list reads it to show which
  // questions have been answered. Saved output is never rendered, so it lives in
  // its ref alone.
  const [questionCodeMap, setQuestionCodeMap] = useState<Record<string, string>>({});
  // Authoritative copies. State drives rendering; these are what navigation and
  // submission read, so neither can act on a stale closure.
  const codeMapRef = useRef<Record<string, string>>({});
  const outMapRef = useRef<Record<string, string>>({});
  const prevQuestionIdRef = useRef<string | undefined>(undefined);

  // pull out current question
  const currentQuestion: StudentQuestion = studentQuestions[currentIndex]!;
  const questionId = currentQuestion?.QuestionsId;
  const questionText = currentQuestion?.questionText || "";

  // Set by the admin on the paper. Papers created before the field existed fall
  // back to Python, which is what the editor actually executed anyway.
  const currentLanguage: LanguageName =
    activePaper?.Language === "javascript" ? "javascript" : "python";
  const theme = themeMap[themeName];
  const language = languageMap[currentLanguage];

  /*
    Moving between questions: file the code that is on screen under the question
    it was actually written for, then load whatever was saved for the question
    being opened.

    The previous version wrote `code` under the NEW questionId, because the effect
    ran after questionId had already changed. Navigating from A to B therefore
    stored A's answer as B's, and nothing ever loaded B's own code, so the student
    was shown A's work against B's question. Any question left untouched kept the
    previous one's answer and was marked against the wrong task.

    The maps are mirrored in refs because this effect depends only on questionId;
    reading the state objects directly would see whatever they held when the
    closure was created, which is not necessarily the latest.
  */
  useEffect(() => {
    const prev = prevQuestionIdRef.current;
    if (prev === questionId) return;

    if (prev) {
      codeMapRef.current[prev] = code;
      outMapRef.current[prev] = consoleOutput;
      setQuestionCodeMap({ ...codeMapRef.current });
    }

    if (questionId) {
      setCode(codeMapRef.current[questionId] ?? STARTER_CODE[currentLanguage]);
      setConsoleOutput(outMapRef.current[questionId] ?? "");
    }

    prevQuestionIdRef.current = questionId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // A freshly loaded paper always opens on its first question; the effect above
  // then loads that question's code.
  useEffect(() => {
    if (!studentQuestions.length) return;
    setCurrentIndex(0);
  }, [studentQuestions]);

  
/*
  Runs the answer in the language selected for this question. Previously every
  Run went through Pyodide regardless, so choosing JavaScript and pressing Run
  reported a Python syntax error — the selector changed only the highlighting.
*/
const runJavaScript = (source: string): string => {
  const lines: string[] = [];
  const format = (args: unknown[]) =>
    args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");

  const sandboxConsole = {
    log: (...args: unknown[]) => lines.push(format(args)),
    error: (...args: unknown[]) => lines.push("Error: " + format(args)),
    warn: (...args: unknown[]) => lines.push(format(args)),
    info: (...args: unknown[]) => lines.push(format(args)),
  };

  try {
    // console and prompt are passed in rather than left global, so student code
    // cannot quietly write over the page's own console.
    const fn = new Function("console", "prompt", `"use strict";\n${source}`);
    const result = fn(sandboxConsole, window.prompt.bind(window));
    if (result !== undefined) lines.push(String(result));
  } catch (err: unknown) {
    lines.push("Error: " + (err instanceof Error ? err.message : String(err)));
  }

  return lines.join("\n");
};

const handleRunCode = async () => {
  setConsoleOpen(true);

  if (questionId) {
    runCountsRef.current[questionId] = (runCountsRef.current[questionId] ?? 0) + 1;
  }

  if (currentLanguage === "javascript") {
    const out = runJavaScript(code);
    setConsoleOutput(out);
    codeMapRef.current[questionId] = code;
    outMapRef.current[questionId] = out;
    setQuestionCodeMap({ ...codeMapRef.current });
    return;
  }

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

  // Running files the code and its output against the question on screen, so a
  // run is not lost if the student navigates away without editing further.
  try {
    const result: string = await pyodide.runPythonAsync(wrapped);
    setConsoleOutput(result);
    codeMapRef.current[questionId] = code;
    outMapRef.current[questionId] = result;
    setQuestionCodeMap({ ...codeMapRef.current });
  } catch (err) {
    const e = String(err);
    setConsoleOutput(e);
    codeMapRef.current[questionId] = code;
    outMapRef.current[questionId] = e;
    setQuestionCodeMap({ ...codeMapRef.current });
  }
};

useEffect(() => {
  const onBeforeUnload = () => { isUnloading.current = true; };
  /*
    Switching away no longer submits the paper. It is recorded instead.

    Auto-submitting on the first hidden tab was severe and fired on things a
    student does not control — a notification taking focus, the screen locking,
    an OS alert — ending the exam irrecoverably, since only one attempt per paper
    is accepted. The count still reaches the invigilator and the analysis, so the
    behaviour remains visible without being punished automatically.
  */
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden" && !isUnloading.current) {
      tabSwitchCountRef.current += 1;
    }
  };
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    window.removeEventListener("beforeunload", onBeforeUnload);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}, []);


  /*
    Submission is a visible state machine, not a silent ref. The request can take
    the best part of a minute when the API has gone to sleep, and previously the
    button still read "Submit" the whole time while further clicks were swallowed
    by the guard — indistinguishable from the page having frozen.
  */
  type SubmitState = "idle" | "submitting" | "done" | "blocked" | "failed";
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState("");
  const hasSubmitted = submitState === "done";
  // The button and the timer can both fire; only one may win.
  const submittingRef = useRef(false);

  async function handleSubmit(reason: AttemptTelemetry["submitReason"] = "manual") {
    if (submittingRef.current) return;

    // localStorage first, then the active document, so a cleared browser can
    // still submit rather than losing the sitting.
    const paperId =
      localStorage.getItem("activeQuestionsId") ?? activePaper?.QuestionsId;
    if (!paperId) {
      toast.error("No active paper found — cannot submit.");
      return;
    }

    /*
      Refuse to submit an empty paper. Only one attempt per paper is accepted, so
      posting zero responses (questions still loading, or a failed fetch) would
      burn the student's only attempt and lock them out with nothing recorded.
      Better to keep them in the editor and let them retry.
    */
    if (studentQuestions.length === 0) {
      toast.error(
        "Your questions have not loaded yet — please wait a moment and try again."
      );
      return;
    }

    submittingRef.current = true;
    setSubmitState("submitting");
    setSubmitError("");

    // From the refs, plus the question currently on screen, which has not been
    // filed yet because that only happens on navigation.
    const codeMap = { ...codeMapRef.current, [questionId]: code };
    const outMap  = { ...outMapRef.current, [questionId]: consoleOutput };

    // Send the work as-is. Grading happens on the server, where a rate-limited
    // grader can retry instead of quietly recording a zero.
    const responses = studentQuestions.map(({ QuestionsId: qid, questionText: qt }) => ({
      QuestionsId:  qid,
      questionText: qt,
      code:         codeMap[qid] ?? "",
      output:       outMap[qid]  ?? "",
      totalScore:   10,
    }));

    const user     = JSON.parse(localStorage.getItem("userData") || "{}");
    const rawId    = user.StudentId || user.MatricNumber || "";
    const studentId= rawId.replace(/\//g, "_");
    const studentName = `${user.FirstName || ""} ${user.LastName || ""}`.trim();
    const department = user.Department || user.DepartmentName || "";

    const startedAt = startedAtRef.current;

    const payload: SubmissionRequest = {
      studentId,
      studentName,
      department,
      timestamp: new Date().toISOString(),
      paperId,
      language: currentLanguage,
      responses,
      telemetry: {
        startedAt,
        durationSeconds: Math.max(
          0,
          Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
        ),
        runCounts: runCountsRef.current,
        tabSwitchCount: tabSwitchCountRef.current,
        clipboardCounts: { ...clipboardCountsRef.current },
        submitReason: reason,
        userAgent: navigator.userAgent,
      },
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
          // A hung request must eventually surface rather than leaving the
          // student staring at a button forever.
          timeout: 90_000,
        }
      );

      toast.success("Submitted successfully!", { autoClose: 2000 });
      setSubmitState("done");

      [
        "examEndsAt",
        "examPaperId",
        "assignedQuestions",
        "currentQuestionIndex",
        "userData",
        "examStartedAt",
        "examTimeLeft", // legacy key from the old countdown
      ].forEach((k) => localStorage.removeItem(k));
      setTimeout(() => (window.location.href = "/"), 3000);

    } catch (err: any) {
      submittingRef.current = false;

      if (err.response) {
        const { status, data } = err.response;

        // Already sat this paper. Say so plainly and stop, rather than leaving
        // them retrying a button that will never succeed.
        if (status === 429) {
          setSubmitState("blocked");
          return;
        }

        setSubmitState("failed");
        setSubmitError(
          data?.message || err.response.statusText || `Request failed (${status})`
        );
      } else {
        setSubmitState("failed");
        setSubmitError(
          err.code === "ECONNABORTED"
            ? "The server did not respond in time. Your work is safe — please try again."
            : "Could not reach the server. Check your connection and try again."
        );
      }
    }
  }

  // The auto-submit handlers below are registered once, so without this ref they
  // would capture the answers as they were when the editor first mounted.
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  /*
    Deadline reached. Declared after the ref so it submits the answers as they
    are now, not as they were when the editor mounted; handleSubmit guards
    against running twice.

    studentQuestions.length is a dependency on purpose. If the deadline has
    already passed when the editor opens — a stale deadline, or a reload after
    time ran out — this fires before the questions have loaded, handleSubmit
    correctly refuses to post an empty paper, and with only timeLeft as a
    dependency it would never retry: the clock sits at 00:00 and nothing can be
    submitted. Re-running when the questions arrive closes that.
  */
  useEffect(() => {
    if (timeLeft === null || timeLeft > 0) return;
    if (studentQuestions.length === 0) return;
    handleSubmitRef.current("timer");
  }, [timeLeft, studentQuestions.length]);

  const handleClearConsole = () => setConsoleOutput("");

  /*
    Urgency is proportional to the paper's own length. The old rule turned the
    clock red below fifteen minutes, which on a twenty-minute practical meant it
    was red for three quarters of the sitting and told students nothing.
  */
  const totalSeconds = (activePaper?.Duration ?? 0) * 60;
  const fraction = totalSeconds > 0 && timeLeft != null ? timeLeft / totalSeconds : 1;
  const critical = timeLeft != null && (fraction <= 0.1 || timeLeft <= 60);
  const warning = !critical && fraction <= 0.25;

  const isAnswered = (qid: string) => {
    const saved = qid === questionId ? code : questionCodeMap[qid];
    return !!saved && saved.trim() !== "" && !isStarter(saved);
  };

  // Already submitted this paper. A toast was too easy to miss, and the editor
  // behind it looked usable when it was not.
  if (submitState === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-600">
            <FaExclamationTriangle size={24} />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-navy-900">
            You have already sat this paper
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-slate-600">
            Your earlier submission was recorded and is being graded. Only one
            attempt per paper is accepted, so this one was not saved. Speak to
            your invigilator if you believe this is wrong.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("userData");
              window.location.href = "/";
            }}
            className="w-full rounded-lg bg-navy-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // 100dvh rather than h-screen: on mobile browsers the viewport unit behind
  // h-screen ignores the address bar, so the footer holding Submit sat below the
  // fold until the bar retracted. dvh tracks the space actually visible.
  return (
    <div className="flex h-[100dvh] flex-col bg-slate-100">
      {/* header */}
      <header className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white">
        <img src="/oau.png" alt="" className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {activePaper?.CourseTitle ?? "Code Editor"}
          </p>
          <p className="text-xs text-navy-200/70">
            Question {currentIndex + 1} of {studentQuestions.length || "…"}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold tabular-nums transition-colors ${
            critical
              ? "animate-pulse bg-red-500 text-white"
              : warning
              ? "bg-gold-400 text-navy-900"
              : "bg-white/10 text-white"
          }`}
          title="Time remaining"
        >
          <span aria-hidden>🕒</span>
          {timeLeft != null ? (
            formatTime(timeLeft)
          ) : (
            <FaSpinner className="inline-block animate-spin" />
          )}
        </div>
      </header>
      <ToastContainer />

      {/* body */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Question panel. Capped on mobile: stacked above the editor with equal
            flex it took half a short viewport and left barely any room to type.
            It scrolls within the cap, and the constraint lifts at md where the
            panels sit side by side. */}
        <div className="flex max-h-[38vh] w-full shrink-0 flex-col border-b border-slate-200 bg-white md:max-h-none md:w-2/5 md:shrink md:border-b-0 md:border-r lg:w-1/3">
          {/* Navigator: with a randomized subset, Prev/Next alone gave students
              no way to see how many were left or which they had attempted. */}
          {studentQuestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 p-3">
              {studentQuestions.map((q, i) => (
                <button
                  key={q.QuestionsId}
                  onClick={() => setCurrentIndex(i)}
                  title={isAnswered(q.QuestionsId) ? "Attempted" : "Not attempted"}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                    i === currentIndex
                      ? "bg-navy-700 text-white"
                      : isAnswered(q.QuestionsId)
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-4">
            {studentLoading ? (
              <div className="flex h-24 items-center justify-center">
                <FaSpinner className="animate-spin text-3xl text-navy-700" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                {formatString(questionText)}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2 border-t border-slate-200 p-3">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentIndex((i) => Math.min(studentQuestions.length - 1, i + 1))
              }
              disabled={currentIndex >= studentQuestions.length - 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {/* editor + console */}
        <div className="flex w-full flex-1 flex-col overflow-hidden p-3 md:w-3/5 lg:w-2/3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Fixed by the paper, so it is shown rather than offered. */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-2.5 py-1.5 text-xs font-medium text-navy-800">
              <span className="h-1.5 w-1.5 rounded-full bg-navy-700" />
              {currentLanguage === "javascript" ? "JavaScript" : "Python"}
            </span>

            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Theme
              <select
                value={themeName}
                onChange={(e) => setThemeName(e.target.value as ThemeName)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-navy-500 focus:outline-none"
              >
                {Object.keys(themeMap).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {!consoleOpen && (
              <button
                onClick={() => setConsoleOpen(true)}
                className="ml-auto rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Show console
              </button>
            )}
          </div>

          {/* height="100%" so the editor fills the pane; it was pinned to 300px
              inside a flex-1 container, leaving dead space below on tall screens. */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-300">
            <CodeMirror
              value={code}
              height="100%"
              className="h-full text-sm"
              extensions={[language, clipboardGuard]}
              theme={theme}
              onChange={setCode}
            />
          </div>

          {consoleOpen && (
            <div className="mt-3 flex h-44 shrink-0 flex-col overflow-hidden rounded-lg bg-slate-900">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Console
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={handleClearConsole}
                    className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setConsoleOpen(false)}
                    className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Hide
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto px-3 py-2 font-mono text-xs text-slate-100">
                {consoleOutput || "Run your code to see output here."}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Submitting can take a while on a cold server; make it unmistakable. */}
      {submitState === "submitting" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4">
          <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-xl bg-white p-6 text-center">
            <FaSpinner className="animate-spin text-2xl text-navy-700" />
            <p className="text-sm font-medium text-navy-900">Submitting your work…</p>
            <p className="text-xs text-slate-500">
              This can take up to a minute. Do not close this tab.
            </p>
          </div>
        </div>
      )}

      {/* footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
        {submitState === "failed" ? (
          <p className="text-xs font-medium text-red-600">
            {submitError} Your answers are still here — press Submit again.
          </p>
        ) : (
          <p className="hidden text-xs text-slate-500 sm:block">
            Your work is only submitted when you press Submit, or when the time
            runs out. The timer keeps running if you close or reload the page.
          </p>
        )}
        {/* Full width on a phone so both actions stay comfortably tappable
            rather than shrinking into the corner. */}
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {/* JavaScript runs in the browser directly, so it does not wait on the
              Python runtime downloading. */}
          <button
            disabled={currentLanguage === "python" && !pyodide}
            onClick={handleRunCode}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none sm:py-2"
          >
            {currentLanguage === "python" && !pyodide ? "Loading Python…" : "Run code"}
          </button>
          <button
            onClick={() => handleSubmit("manual")}
            disabled={submitState === "submitting" || hasSubmitted}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors sm:flex-none sm:py-2 ${
              submitState === "submitting" || hasSubmitted
                ? "cursor-not-allowed bg-slate-400"
                : "bg-navy-700 hover:bg-navy-800"
            }`}
          >
            {submitState === "submitting" && (
              <FaSpinner className="animate-spin" />
            )}
            {submitState === "submitting"
              ? "Submitting…"
              : hasSubmitted
              ? "Submitted"
              : "Submit"}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Editor;
