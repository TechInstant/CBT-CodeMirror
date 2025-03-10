import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MonacoEditor from "@monaco-editor/react";

const CodeSection: React.FC = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [code, setCode] = useState<string>("print('Hello, World!')");
  const [timeLeft, setTimeLeft] = useState(3600); // 30 minutes in seconds
  const [pyodide, setPyodide] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load Pyodide dynamically from CDN
  useEffect(() => {
    const loadPyodideCDN = async () => {
      try {
        setLoading(true);
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
        script.onload = async () => {
          // @ts-ignore
          const py = await window.loadPyodide();
          setPyodide(py);
          setLoading(false);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error("❌ Failed to load Pyodide:", error);
      }
    };
    loadPyodideCDN();
  }, []);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prevTime) => prevTime - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format Timer Display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRunCode = async () => {
    setConsoleOpen(true);
    if (!pyodide) {
      setConsoleOutput("⚠️ Python runtime is still loading...");
      return;
    }
  
    try {
      // Redirect stdout to capture `print()` output
      pyodide.runPython(`
        import sys
        from io import StringIO
  
        sys.stdout = StringIO()  # Capture printed output
        sys.stderr = sys.stdout  # Capture errors
      `);
  
      // Try evaluating the code and capturing the result
      let result;
      try {
        result = pyodide.runPython(code);
      } catch (error) {
        result = ""; // Prevent breaking the next step
      }
  
      // Get the captured output
      const printedOutput = pyodide.runPython("sys.stdout.getvalue()");
  
      // Format the output (combine printed output and evaluated result)
      let finalOutput = printedOutput;
      if (result !== undefined && result !== "") {
        finalOutput += `\n${result}`;
      }
  
      setConsoleOutput(finalOutput.trim() || "⚠️ No output returned.");
    } catch (error) {
      setConsoleOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  
  

  // Submit Code Function
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
      {/* Header */}
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center relative">
        Python Code Editor
        <div className="absolute right-4 top-2 text-white font-bold text-lg">
          🕒 Time {formatTime(timeLeft)}
        </div>
      </div>

      {/* Toast Notification */}
      <ToastContainer />

      <div className="flex flex-1">
        {/* Problem Statement */}
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <h2 className="text-lg font-bold">Python</h2>
          <p className="mt-2">Questions here!</p>
          <h3 className="mt-4 font-semibold">Example:</h3>
          <p><strong>Input:</strong> "2+2"</p>
          <p><strong>Output:</strong> "4"</p>
        </div>

        {/* Code Editor */}
        <div className="w-2/3 p-4 bg-white border-l">
          {loading ? (
            <p>🔄 Loading Python Runtime...</p>
          ) : (
            <MonacoEditor
              height="300px"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{ minimap: { enabled: false } }}
            />
          )}
        </div>
      </div>

      {/* Console Output */}
      {consoleOpen && (
        <div className="w-full bg-black text-white p-2 h-32 overflow-auto">
          <p>Console Output:</p>
          <p>{consoleOutput}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end space-x-4 p-4">
        <button
          onClick={handleRunCode}
          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
          disabled={loading}
        >
          {loading ? "Loading..." : "Run Code"}
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
