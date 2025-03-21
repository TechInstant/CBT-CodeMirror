import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse";
import axios from "axios";
import { baseUrl, GetToken } from "../App";

const AdminUpload: React.FC = () => {
  const [step, setStep] = useState(1);
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [questionsData, setQuestionsData] = useState<any[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [timer, setTimer] = useState("00:01:00"); 

  const navigate = useNavigate();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    if (event.target.files) {
      const file = event.target.files[0];
      type === "students" ? setStudentsFile(file) : setQuestionsFile(file);

      const reader = new FileReader();
      reader.onload = async ({ target }) => {
        if (target?.result) {
          Papa.parse(target.result as string, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
              if (type === "students") {
                const formattedStudents = results.data.map((student: any) => {
                  const names = student.Names ? student.Names.split(" ") : ["", ""];
                  return {
                    UserId: student.MatricNo || " ",
                    FirstName: names[1] || " ",
                    LastName: names[0] || " ",
                    Department: student.Department || " ",
                    Role: "Student",
                    Email: " ",
                  };
                });
                setStudentsData(formattedStudents);
                toast.success("Students file processed successfully!");
              } else {
                const formattedQuestions = results.data.map((question: any) => ({
                  questionText: question.QUESTIONS || "",
                }));
                setQuestionsData(formattedQuestions);
                toast.success("Questions file processed successfully!");
              }
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleNext = () => {
    if (step === 1 && !studentsFile) return toast.error("Please upload the students CSV file!");
    if (step === 2 && !questionsFile) return toast.error("Please upload the questions CSV file!");
    if (step === 3 && !courseTitle) return toast.error("Please enter a course title!");
    setStep(step + 1);
  };

  const handlePrevious = () => step > 1 && setStep(step - 1);

  const handleSubmit = async () => {
    if (studentsData.length === 0 || questionsData.length === 0) {
      return toast.error("Please upload and process both students and questions files!");
    }
    try {
      const idToken = await GetToken();
      for (const student of studentsData) {
        try {
          await axios.post(`${baseUrl}/users`, student, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error uploading ${student.UserId}:`, error);
        }
      }
      const questions = {
        courseTitle,
        timer,
        questions: questionsData,
        createdAt: new Date().toISOString(),
      };
      console.log("Sending Questions Payload:", JSON.stringify(questions, null, 2)); 
      await axios.post(`${baseUrl}/questions`, questions, {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },       
      });     
      toast.success("Data uploaded successfully!");
      navigate("/AdminDashboard");
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Error uploading data.");
    }
  };

  return (
    <div className="max-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        Admin Upload
      </div>

      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        {step === 1 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 1: Upload Students CSV</p>
            <button
              onClick={() => document.getElementById("studentsFile")?.click()}
              className="w-full mb-4 p-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer flex items-center justify-center"
            >
              Upload Students CSV <FaUpload className="ml-2" />
            </button>
            <input type="file" id="studentsFile" accept=".csv" className="hidden" onChange={(e) => handleFileChange(e, "students")} />
            {studentsFile && <p className="text-sm text-gray-700">{studentsFile.name}</p>}
            {studentsData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-sm font-semibold">Preview:</p>
                <table className="w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      {Object.keys(studentsData[0]).map((key) => (
                        <th key={key} className="border p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border">
                        {Object.values(row).map((value, idx) => (
                          <td key={idx} className="border p-2">{value as string}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 2: Upload Questions File</p>
            <button
              onClick={() => document.getElementById("questionsFile")?.click()}
              className="w-full mb-4 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer flex items-center justify-center"
            >
              Upload Questions CSV File <FaUpload className="ml-2" />
            </button>
            <input type="file" id="questionsFile" accept=".csv" className="hidden" onChange={(e) => handleFileChange(e, "questions")} />
            {questionsFile && <p className="text-sm text-gray-700">{questionsFile.name}</p>}
            {questionsData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-sm font-semibold">Preview:</p>
                <table className="w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      {Object.keys(questionsData[0]).map((key) => (
                        <th key={key} className="border p-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {questionsData.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border">
                        {Object.values(row).map((value, idx) => (
                          <td key={idx} className="border p-2">{value as string}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="mb-2 text-sm font-semibold">Step 3: Enter Course Details</p>
            <label className="block text-sm font-medium text-gray-700">Course Title</label>
            <input type="text" className="w-full border rounded-md p-2 mt-2" placeholder="Enter course title" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            <label className="block text-sm font-medium text-gray-700 mt-4">Set Timer</label>
            <input type="time" step="1" className="w-full border rounded-md p-2 mt-2" value={timer} onChange={(e) => setTimer(e.target.value)} />
          </>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 && <button onClick={handlePrevious} className="px-4 py-2 bg-gray-400 text-white rounded-md">Previous</button>}
          {step < 3 ? <button onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-md">Next</button> : <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md">Submit</button>}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default AdminUpload;
