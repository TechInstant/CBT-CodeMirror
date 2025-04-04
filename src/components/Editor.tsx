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
import axios from "axios";
import { baseUrl, GetToken } from "../App";
import { formatString } from "../components/FormatString"; 


const CodeSection: React.FC = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [code, setCode] = useState<string>("print('Hello, World!')");
  const [timeLeft, setTimeLeft] = useState(3600);
  const [theme, setTheme] = useState(oneDark);
  const [language, setLanguage] = useState(python());
  const [pyodide, setPyodide] = useState<any>(null);
  interface Question {
    Questions: string[];
  }
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignedQuestion, setAssignedQuestion] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
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
        pyInstance.setStdout({
          batched: (text: string) => setConsoleOutput((prev) => prev + "\n" + text),
        });
        pyInstance.setStderr({
          batched: (output: string) => setConsoleOutput((prev) => prev + "\nError: " + output),
        });
        setPyodide(pyInstance);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      }
    };
    loadPython();
  }, []);

 
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prevTime) => prevTime - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const idToken = await GetToken(); 
        const questionResponse = await axios.get(`${baseUrl}/questions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
  
        setQuestions(questionResponse.data);
        console.log("Questions:", questionResponse.data);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
  
    const fetchStudentId = () => {
      const userData = localStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData); 
        setStudentId(parsedData.StudentId);
      }
    };
  
    fetchQuestions();
    fetchStudentId();
  }, []);
  
  useEffect(() => {
    if (questions.length > 0 && studentId) {
      const storedQuestion = localStorage.getItem("assignedQuestion");
      if (storedQuestion) {
        setAssignedQuestion(storedQuestion);
      } else {
        const numericPart = studentId.replace(/\D/g, "");
        const studentIndex = parseInt(numericPart, 10) % questions.length;
        const studentQuestions = questions[studentIndex]?.Questions || [];

        if (studentQuestions.length > 0) {
          const randomIndex = Math.floor(Math.random() * studentQuestions.length);
          const newAssignedQuestion = studentQuestions[randomIndex];
          setAssignedQuestion(newAssignedQuestion);
          localStorage.setItem("assignedQuestion", newAssignedQuestion);
        } else {
          setAssignedQuestion("No question available for this student.");
        }
  
        console.log("Extracted Number:", numericPart);
        console.log("Student Index:", studentIndex);
      }
    }
  }, [questions, studentId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

 

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

  
  return (
    <div className="h-screen flex flex-col">
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center relative">
         Code Editor
        <div className="absolute right-4 top-2 text-white font-bold text-lg">
          🕒 Time {formatTime(timeLeft)}
        </div>
      </div>

      <ToastContainer />

      <div className="flex flex-1">
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <p className="text-lg font-bold">Questions</p>
          <div>{formatString(assignedQuestion || "Loading....")}</div>
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
          )}        </div>
      </div>
      <div className="flex justify-end space-x-4 p-4">
        <button onClick={handleRunCode} className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500">Run Code</button>
        <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Submit</button>  
      </div>
    </div>

  );
};

export default CodeSection;
