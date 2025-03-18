import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const AdminUpload: React.FC = () => {
  const [step, setStep] = useState(1);
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [timer, setTimer] = useState("");
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleStudentsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setStudentsFile(event.target.files[0]);
      toast.success("Students file selected successfully!");
    }
  };

  const handleQuestionsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setQuestionsFile(event.target.files[0]);
      toast.success("Questions file selected successfully!");
    }
  };


  const handleSubmit = () => {
    if (!questionsFile || !courseTitle || !timer) {
      toast.error("All fields are required before submission!");
      return;
    }
    toast.success("Questions uploaded successfully!");
    navigate("../adminDashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        Admin Upload
      </div>

      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        {/* Upload Students CSV */}
        <button
          onClick={() => document.getElementById("studentsFile")?.click()}
          className="w-full mb-4 p-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer flex items-center justify-center"
        >
          Upload Students CSV <FaUpload className="ml-2" />
        </button>
        <input
          type="file"
          id="studentsFile"
          accept=".csv"
          className="hidden"
          onChange={handleStudentsFileChange}
        />
        {studentsFile && <p className="text-sm text-gray-700">{studentsFile.name}</p>}

        {/* Upload Questions */}
        <div className="mb-4 flex items-center">
          <input
            type="file"
            id="questionsFile"
            accept=".txt,.pdf"
            className="hidden"
            onChange={handleQuestionsFileChange}
          />
          <button
            onClick={() => document.getElementById("questionsFile")?.click()}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer flex items-center"
          >
            Upload Questions <FaUpload className="ml-2" />
          </button>
          {questionsFile && <p className="ml-2 text-sm text-gray-700">{questionsFile.name}</p>}
        </div>

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Course Title</label>
            <input
              type="text"
              className="w-full border rounded-md p-2 mt-2"
              placeholder="Enter course title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Set Timer</label>
            <input
              type="time"
              className="w-full border rounded-md p-2 mt-2"
              value={timer}
              onChange={(e) => setTimer(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500 cursor-pointer"
            >
              Previous
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer"
            >
              Submit
            </button>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AdminUpload;
