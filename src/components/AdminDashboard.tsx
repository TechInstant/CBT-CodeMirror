import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { baseUrl, GetToken } from "../App";
import StudentList from "../components/StudentList";
import QuestionsList from "../components/QuestionsList";
import StudentScores from "../components/StudentScores";

interface Admin {
  FirstName: string;
  LastName: string;
  Department?: string;
  Email?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);

  useEffect(() => {
    const AdminData = localStorage.getItem("userData");
    if (AdminData) {
      setAdmin(JSON.parse(AdminData));
    }
  }, []);

  useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const idToken = await GetToken();
        const response = await axios.get(`${baseUrl}/students`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setStudentCount(response.data.length);
      } catch (error) {
        // console.error("Error fetching students:", error);
      }
    };
    fetchStudentCount();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userData");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-blue-700 text-white p-4">
        <h1 className="text-2xl font-bold mb-4">CSCM CodeMirror</h1>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="block w-full text-left p-2 hover:bg-blue-600 rounded transition-colors duration-200"
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className="block w-full text-left p-2 hover:bg-blue-600 rounded transition-colors duration-200"
          >
            Questions
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className="block w-full text-left p-2 hover:bg-blue-600 rounded transition-colors duration-200"
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("StudentScores")}
            className="block w-full text-left p-2 hover:bg-blue-600 rounded transition-colors duration-200"
          >
            Students Scores
          </button>
          <a
            href="/adminupload"
            className="block p-2 hover:bg-blue-600 rounded transition-colors duration-200"
          >
            Upload
          </a>
          <button
            onClick={handleLogout}
            className="block w-full text-left p-2 hover:bg-blue-600 rounded mt-10 transition-colors duration-200"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {activeTab === "dashboard" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
            <div className="bg-white p-4 shadow-md rounded">
              <p className="text-center text-2xl font-bold">
                Welcome {admin ? `${admin.FirstName} ${admin.LastName}` : "Admin"}
              </p>
              <p className="text-center text-lg font-semibold mt-4">
                Total Students: {studentCount}
              </p>
            </div>
          </div>
        )}

        {activeTab === "students" && <StudentList />}
        {activeTab === "questions" && <QuestionsList />}
        {activeTab === "StudentScores" && <StudentScores />}

        
      </div>
    </div>
  );
};

export default AdminDashboard;
