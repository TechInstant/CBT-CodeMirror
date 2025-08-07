import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUpload, FaArrowLeft } from "react-icons/fa";
import { CiSquareQuestion } from "react-icons/ci";
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
  const [timer, setTimer] = useState("");
  const [MaxAnswerable, setMaxAnswerable] = useState<number>(0);
  const [showMaxInfo, setShowMaxInfo] = useState<boolean>(false);

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
                    StudentId: student.MatricNo || " ",
                    FirstName: names[1] || " ",
                    LastName: names[0] || " ",
                    Department: student.Department || " ",
                    Password: student.Password || " ",
                    Role: "Student",
                    Email: " ",
                  };
                });
                setStudentsData(formattedStudents);
              } else {
                let questionsArray: any = [];
                results.data.forEach((question: any) => {
                  questionsArray.push({
                    questionId: question["Question ID"],
                    questionText: question.Question,
                  });
                });
                setQuestionsData(questionsArray);
                // Clamp MaxAnswerable if needed
                setMaxAnswerable(prev =>
                  prev > questionsArray.length ? questionsArray.length : prev
                );
              }
            },
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleNext = () => {
    if (step === 1 && !studentsFile) {
      return toast.error("Please upload the students CSV file!");
    }
    if (step === 2 && !questionsFile) {
      return toast.error("Please upload the questions CSV file!");
    }
    if (step === 3 && !courseTitle) {
      return toast.error("Please enter a course title!");
    }
    setStep(step + 1);
  };

  const handlePrevious = () => step > 1 && setStep(step - 1);

  const handleSubmit = async () => {
    if (studentsData.length === 0 || questionsData.length === 0) {
      return toast.error(
        "Please upload and process both students and questions files!"
      );
    }
    try {
      const idToken = await GetToken();
      const existingResponse = await axios.get(`${baseUrl}/students`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const existingStudents = existingResponse.data;
      const existingStudentIds = new Set(
        existingStudents.map((s: any) => s.StudentId)
      );

      for (const student of studentsData) {
        if (existingStudentIds.has(student.StudentId)) {
          continue;
        }
        try {
          await axios.post(`${baseUrl}/students`, student, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
        } catch {

        }
      }

      const questions = {
        CourseTitle: courseTitle,
        Duration: Number(timer),
        MaxAnswerable: MaxAnswerable,
        Questions: questionsData,
        CourseCode: "",
      };

      await axios.post(`${baseUrl}/questions`, questions, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("Data uploaded successfully!");
      navigate("/AdminDashboard");
    } catch {
      toast.error("Error uploading data.");
    }
  };

  const totalQuestions = questionsData.length;

  return (
    <div className="max-h-screen flex flex-col items-center justify-center bg-white">
      <div className="absolute top-4 left-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </div>

      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        Admin Upload
      </div>

      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        {/* Step 1: Students Upload */}
        {step === 1 && (
          <>
            <p className="mb-2 text-sm font-semibold">
              Step 1: Upload Students CSV
            </p>
            {/* Show expected format */}
            <details className="mb-4">
              <summary className="cursor-pointer text-blue-600">
                View required student CSV format
              </summary>
              <div className="mt-2 overflow-x-auto bg-white border p-2 rounded">
                <p className="text-xs text-gray-600 mb-1">
                  Required headers (case-sensitive):<br/>
                  <code>Names,MatricNo,Department,Password</code><br/>
                  <strong>Names</strong>: full name, e.g. "Nuel John".<br/>
                  <strong>MatricNo</strong>: student ID.<br/>
                  <strong>Department</strong>: e.g. "Computer Science".<br/>
                  {/* - <strong>Password</strong>(or blank).<br/> */}
                </p>
                <table className="w-full text-xs border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-1">Names</th>
                      <th className="border p-1">MatricNo</th>
                      <th className="border p-1">Department</th>
                      {/* <th className="border p-1">Password</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1">Doe John</td>
                      <td className="border p-1">CS12345</td>
                      <td className="border p-1">Computer Science</td>
                      {/* <td className="border p-1">pass123</td> */}
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

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
              onChange={(e) => handleFileChange(e, "students")}
            />
            {studentsFile && (
              <p className="text-sm text-gray-700">{studentsFile.name}</p>
            )}
            {studentsData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-sm font-semibold">Preview (first row):</p>
                <table className="w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      {Object.keys(studentsData[0]).map((key) => (
                        <th key={key} className="border p-2">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentsData.slice(0, 1).map((row, index) => (
                      <tr key={index} className="border">
                        {Object.values(row).map((value, idx) => (
                          <td key={idx} className="border p-2">
                            {value as string}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Step 2: Questions Upload */}
        {step === 2 && (
          <>
            <p className="mb-2 text-sm font-semibold">
              Step 2: Upload Questions CSV
            </p>
            {/* Show expected format */}
            <details className="mb-4">
              <summary className="cursor-pointer text-blue-600">
                View required questions CSV format
              </summary>
              <div className="mt-2 overflow-x-auto bg-white border p-2 rounded text-xs">
                <p className="text-gray-600 mb-1">
                  Required headers (case-sensitive):<br/>
                  <code>Question ID,Question</code><br/>
                  - <strong>Question ID</strong>: unique identifier.<br/>
                  - <strong>Question</strong>: question text.<br/>
                </p>
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-1">Question ID</th>
                      <th className="border p-1">Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1">Q1</td>
                      <td className="border p-1">Explain OOP concepts.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>

            <button
              onClick={() => document.getElementById("questionsFile")?.click()}
              className="w-full mb-4 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer flex items-center justify-center"
            >
              Upload Questions CSV File <FaUpload className="ml-2" />
            </button>
            <input
              type="file"
              id="questionsFile"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, "questions")}
            />
            {questionsFile && (
              <p className="text-sm text-gray-700">{questionsFile.name}</p>
            )}
            {questionsData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <p className="text-sm font-semibold">Preview (first row):</p>
                <table className="w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2">Question ID</th>
                      <th className="border p-2">Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionsData.slice(0, 1).map((q, idx) => (
                      <tr key={idx}>
                        <td className="border p-2">{q.questionId}</td>
                        <td className="border p-2">{q.questionText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Step 3: Course Details and Maximum Questions */}
        {step === 3 && (
          <>
            <p className="mb-2 text-sm font-semibold">
              Step 3: Enter Course Details
            </p>
            <label className="block text-sm font-medium text-gray-700">
              Course Title
            </label>
            <input
              type="text"
              className="w-full border rounded-md p-2 mt-2"
              placeholder="Enter course title"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
            />
            <label className="block text-sm font-medium text-gray-700 mt-4">
              Set Duration (in minutes)
            </label>
            <input
              type="number"
              className="w-full border rounded-md p-2 mt-2"
              value={timer}
              onChange={(e) => setTimer(e.target.value)}
            />

            {/* Maximum Questions Field */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Max Answerable Questions
                <sup>
                  <div className="relative inline-block">
                    <CiSquareQuestion
                      className="inline text-blue-600 cursor-pointer text-2xl"
                      onClick={() => setShowMaxInfo(!showMaxInfo)}
                    />
                    {showMaxInfo && (
                      <div
                        className="absolute z-10 top-[-5px] left-[40px] p-2 border rounded bg-white shadow text-xs"
                        onClick={() => setShowMaxInfo(false)}
                      >
                        <p>
                          This is the number of questions made available per
                          student. Choose{" "}
                          <span className="text-green-600">"MAX"</span> to use
                          all uploaded questions.
                        </p>
                      </div>
                    )}
                  </div>
                </sup>
              </label>
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="number"
                  className="w-24 border rounded-md p-2"
                  value={MaxAnswerable}
                  min={0}
                  max={totalQuestions}
                  onChange={(e) => {
                    let val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 0) val = 0;
                    if (val > totalQuestions) val = totalQuestions;
                    setMaxAnswerable(val);
                  }}
                />
                <span
                  onClick={() => {
                    if (MaxAnswerable !== totalQuestions) {
                      setMaxAnswerable(totalQuestions);
                    }
                  }}
                  className={
                    "ml-1 " +
                    (MaxAnswerable === totalQuestions
                      ? "text-gray-400 cursor-not-allowed select-none"
                      : "text-green-600 cursor-pointer")
                  }
                  title={
                    MaxAnswerable === totalQuestions
                      ? "Already at MAX"
                      : "Set to total questions"
                  }
                >
                  MAX
                </span>
                <span className="text-sm text-gray-500">/ {totalQuestions}</span>
              </div>
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-400 text-white rounded-md"
            >
              Previous
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-md"
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
