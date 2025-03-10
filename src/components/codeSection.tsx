import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CodeSection: React.FC = () => {
  const [consoleOpen, setConsoleOpen] = useState(false);

  const handleRunCode = () => {
    setConsoleOpen(true);
  };

  const handleSubmit = () => {
    toast.success("Code submitted successfully!", {
      position: "top-right",
      autoClose: 3000, 
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });

    setTimeout(() => {
      window.location.href = "/studentLogin"; 
    }, 3500); 
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="w-full bg-blue-600 py-3 text-white text-lg font-bold text-center">
        CM CodeMirror
      </div>

      {/* Toast Notification */}
      <ToastContainer />

      <div className="flex flex-1">
        {/* Problem Statement */}
        <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
          <h2 className="text-lg font-bold">Caesar Cipher</h2>
          <p className="mt-2">
            Given a ciphertext encrypted with Caesar cipher as input string, find the corresponding plaintext and return the plaintext as output string.
          </p>
          <h3 className="mt-4 font-semibold">Example:</h3>
          <p><strong>Input:</strong> 2+2</p>
          <p><strong>Output:</strong> 4</p>
        </div>

        {/* Code Editor */}
        <div className="w-2/3 p-4 bg-white border-l">
          <textarea
            className="w-full h-80 p-2 border rounded-md"
            placeholder="Write your code here..."
          />
        </div>
      </div>

      {/* Console Output */}
      {consoleOpen && (
        <div className="w-full bg-black text-white p-2 h-32 overflow-auto">
          <p>Console Output:</p>
          <p>Running code...</p>
        </div>
      )}

      {/* Buttons */}
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
