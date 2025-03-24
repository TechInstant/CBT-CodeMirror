import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { python } from "@codemirror/lang-python";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { material } from "@uiw/codemirror-theme-material";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { loadPyodide } from "pyodide";

const CodeSection: React.FC = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [code, setCode] = useState<string>("print('Hello, World!')");
  const [timeLeft, setTimeLeft] = useState(3600);
  // const [worker, setWorker] = useState<Worker | null>(null);
  const [theme, setTheme] = useState(oneDark);
  const [language, setLanguage] = useState(python());
  const [pyodide, setPyodide] = useState<any>(null);

  const themeMap: Record<string, any> = {
    "one-dark": oneDark,
    "material": material,
    "dracula": dracula,
  };
  const languageMap: Record<string, any> = {
    python: python(),
    javascript: javascript(),
  };

  useEffect(() => {
    const loadPython = async () => {
      try {
        const pyInstance = await loadPyodide();
        setPyodide(pyInstance);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      }
    };
    loadPython();
  }, []);
  // useEffect(() => {
  //   const newWorker = new Worker("/pyWorker.js");
  //   newWorker.onmessage = (event) => {
  //     const { type, data } = event.data;
  //     if (type === "output") {
  //       setConsoleOutput(data);
  //     } else if (type === "error") {
  //       setConsoleOutput(`Error: ${data}`);
  //     }
  //   };
  //   setWorker(newWorker);
  //   return () => newWorker.terminate();
  // }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prevTime) => prevTime - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // const handleRunCode = () => {
  //   setConsoleOpen(true);
  //   if (!worker) {
  //     setConsoleOutput("Python runtime is still loading...");
  //     return;
  //   }
  //   worker.postMessage({ code });
  // };

  const handleRunCode = async () => {
    setConsoleOpen(true);
    if (!pyodide) {
      setConsoleOutput("Python runtime is still loading...");
      return;
    }

    try {
      const result = await pyodide.runPythonAsync(code);
      setConsoleOutput(result);
    } catch (error) {
      setConsoleOutput(`Error: ${error}`);
    }
  };

  const handleSubmit = () => {
    toast.success("Code submitted successfully!", {
      position: "top-right",
      autoClose: 3000,
    });
    setTimeout(() => {
      window.location.href = "/studentLogin";
    }, 3500);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center relative">
        Python Code Editor
        <div className="absolute right-4 top-2 text-white font-bold text-lg">
          🕒 Time {formatTime(timeLeft)}
        </div>
      </div>

      <ToastContainer />

      <div className="flex flex-1">
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <p className="text-lg font-bold">Questions</p>
          <p>Questions here!</p>
        </div>

        <div className="w-2/3 p-4 bg-white border-l flex flex-col">
          <div className="mb-4 flex space-x-4">
            <select
              className="px-3 py-2 border rounded-md bg-gray-200 text-gray-800"
              onChange={(e) => setTheme(themeMap[e.target.value])}
            >
              {Object.keys(themeMap).map((themeName) => (
                <option key={themeName} value={themeName}>
                  {themeName}
                </option>
              ))}
            </select>

            {/* Language Selection */}
            <select
              className="px-3 py-2 border rounded-md bg-gray-200 text-gray-800"
              onChange={(e) => setLanguage(languageMap[e.target.value])}
            >
              {Object.keys(languageMap).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow">
            <CodeMirror
              value={code}
              height="300px"
              extensions={[language]}
              theme={theme}
              onChange={(value) => setCode(value)}
            />
          </div>

          {consoleOpen && (
            <div className="w-full bg-black text-white h-40 mt-2 overflow-auto">
              <p className="text-lg font-bold mb-2">Console Output:</p>
              <div className="bg-gray-900 p-3 rounded-md overflow-auto h-28">
                <pre className="whitespace-pre-wrap break-words">{consoleOutput}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 p-4">
        <button
          onClick={handleRunCode}
          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
        >
          Run Code
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default CodeSection;
