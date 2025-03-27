import { useState, useEffect } from "react";
import axios from "axios";
import { baseUrl, GetToken } from "../App";
import { CSVLink } from "react-csv";
import { useNavigate } from "react-router-dom";

type User = {
  UserId: string;
  StudentId: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Email: string;
  Scores: number;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [students, setStudentData] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [firstName, setFirstName] = useState(localStorage.getItem("FirstName") || "");
  const [LastName, setLastName] = useState(localStorage.getItem("LastName") || "");

  useEffect(() => {
    const storedFirstName = localStorage.getItem("FirstName");
  const storedLastName = localStorage.getItem("LastName");

  if (storedFirstName) setFirstName(storedFirstName);
  if (storedLastName) setLastName(storedLastName);
  }, []);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const idToken = await GetToken();
        
              const studentResponse = await axios.get<User[]>(`${baseUrl}/students`, {
                headers: { Authorization: `Bearer ${idToken}` },
              });
              setStudentData(studentResponse.data);
              
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("FirstName");
    localStorage.removeItem("LastName");
    localStorage.removeItem("Department");
    navigate("/"); 
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-blue-700 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">CSCM CodeMirror</h1>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className="block w-full text-left p-2 hover:bg-blue-600 rounded">Dashboard</button>
          <button onClick={() => setActiveTab("Questions")} className="block w-full text-left p-2 hover:bg-blue-600 rounded">Questions</button>
          <button onClick={() => setActiveTab("students")} className="block w-full text-left p-2 hover:bg-blue-600 rounded">Students</button>
          <a href="/adminupload" className="block p-2 hover:bg-blue-600 rounded">Upload</a>
          <button onClick={handleLogout} className="block w-full text-left p-2 bg-blue-300 hover:bg-blue-600 rounded mt-10">Logout</button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-6">
      {activeTab === "dashboard" && (
  <div>
    <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
    <div className="bg-white p-4 shadow-md rounded">
      <p className="text-center text-2xl font-bold"> Welcome {`${firstName} ${LastName}`}</p>
      <p className="text-center text-lg font-semibold mt-4">Total Students: {students.length}</p>
    </div>
  </div> // Removed the extra curly brace here
)}

        {activeTab === "students" && (
          <div>
            <p className="text-xl font-bold mb-4">Student List</p>
            <div className="bg-white p-4 shadow-md rounded">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">First Name</th>
                    <th className="border p-2">Last Name</th>
                    <th className="border p-2">Matric No.</th>
                    <th className="border p-2">Department</th>
                    <th className="border p-2">Email</th>
                    <th className="border p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={index} className="text-center border-b">
                      <td className="border p-2">{student.FirstName}</td>
                      <td className="border p-2">{student.LastName}</td>
                      <td className="border p-2">{student.StudentId}</td>
                      <td className="border p-2">{student.Department}</td>
                      <td className="border p-2">{student.Email}</td>
                      <td className="border p-2">{student.Scores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4">
                <CSVLink data={students} filename="students_results.csv" className="bg-green-500 text-white p-2 rounded">Download Results</CSVLink>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default AdminDashboard;
