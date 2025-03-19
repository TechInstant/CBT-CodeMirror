import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse"; 
import axios from "axios";

const AdminUpload: React.FC = () => {
  const [step, setStep] = useState(1);
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [timer, setTimer] = useState("");
  const navigate = useNavigate();

  // Handle Students CSV File
  const handleStudentsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const file = event.target.files[0];
      setStudentsFile(file);

      // Read and Parse CSV File
      const reader = new FileReader();
      reader.onload = ({ target }) => {
        if (target?.result) {
          Papa.parse(target.result as string, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              console.log("Parsed CSV Data:", results.data);
              setStudentsData(results.data);
              toast.success("Students file processed successfully!");
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle Questions File Selection
  const handleQuestionsFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setQuestionsFile(event.target.files[0]);
      toast.success("Questions file selected successfully!");
    }
  };

  // Proceed to Next Step
  const handleNext = () => {
    if (step === 1 && !studentsFile) {
      toast.error("Please upload the students CSV file!");
      return;
    }
    if (step === 2 && !questionsFile) {
      toast.error("Please upload the questions cSV file!");
      return;
    }
    setStep(step + 1);
  };

  // Go Back to Previous Step
  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  // Submit Data to Backend
  const handleSubmit = async () => {
    if (!courseTitle || !timer) {
      toast.error("Course Title and Timer are required!");
      return;
    }

    try {
      // Upload Questions File
      const formData = new FormData();
      formData.append("questionsFile", questionsFile!);
      formData.append("courseTitle", courseTitle);
      formData.append("timer", timer);

      //convert csv to text before sending to backend
      const questionsResponse = await axios.post("https://doyenifycbt-enas3l3ehq-uc.a.run.app/questions", formData);
      if (questionsResponse.status !== 200) throw new Error("Failed to upload questions.");

      // Upload Students Data
      const studentsResponse = await axios.post("https://doyenifycbt-enas3l3ehq-uc.a.run.app/users", {
        students: studentsData,
      });
      if (studentsResponse.status !== 200) throw new Error("Failed to upload students.");

      toast.success("Upload successful!");
      navigate("../adminDashboard");
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Error uploading files. Check console.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        Admin Upload
      </div>

      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        {/* Step 1: Upload Students CSV */}
        {step === 1 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 1: Upload Students CSV</p>
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
          </>
        )}

        {/* Step 2: Upload Questions File */}
        {step === 2 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 2: Upload Questions File</p>
            <button
              onClick={() => document.getElementById("questionsFile")?.click()}
              className="w-full mb-4 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer flex items-center justify-center"
            >
              Upload Questions CSV File <FaUpload className="ml-2" />
            </button>
            <input
              type="file"
              id="questionsFile"
              accept=".CSV"
              className="hidden"
              onChange={handleQuestionsFileChange}
            />
            {questionsFile && <p className="text-sm text-gray-700">{questionsFile.name}</p>}
          </>
        )}

        {/* Step 3: Enter Course Title & Timer */}
        {step === 3 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 3: Enter Course Details</p>
            <label className="block text-sm font-medium text-gray-700">Course Title</label>
            <input
              type="text"
              className="w-full border rounded-md p-2 mt-2"
              placeholder="Enter course title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />

            <label className="block text-sm font-medium text-gray-700 mt-4">Set Timer</label>
            <input
              type="time"
              className="w-full border rounded-md p-2 mt-2"
              value={timer}
              onChange={(e) => setTimer(e.target.value)}
            />
          </>
        )}

        {/* Navigation Buttons */}
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
