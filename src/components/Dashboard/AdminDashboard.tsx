import { useEffect, useState } from "react";
import { baseUrl, GetToken } from "../../App";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Users, FileText } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Admin {
  FirstName: string;
  LastName: string;
  Department?: string;
  Email?: string;
}

const AdminDashboard = () => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [departmentData, setDepartmentData] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const AdminData = localStorage.getItem("userData");
    if (AdminData) setAdmin(JSON.parse(AdminData));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = await GetToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        const studentRes = await fetch(`${baseUrl}/students`, { headers });
        const students = await studentRes.json();
        setTotalStudents(students.length);

        const submissionRes = await fetch(`${baseUrl}/submissions`, { headers });
        const submissions = await submissionRes.json();
        setTotalSubmissions(submissions.length);

        const departmentBreakdown: { [key: string]: number } = {};
        submissions.forEach((s: any) => {
          const dept = s.department || "Unknown";
          departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
        });

        setDepartmentData(departmentBreakdown);
      } catch (error) {
        console.error("Error loading dashboard:", error);
      }
    };

    fetchData();
  }, []);

  const chartData = {
    labels: Object.keys(departmentData),
    datasets: [
      {
        label: "Submissions",
        data: Object.values(departmentData),
        backgroundColor: "rgba(99, 102, 241, 0.7)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <div className="bg-purple-200 py-4 px-4 flex justify-center items-center">
        <h1 className="text-2xl font-bold text-purple-800 text-center">CSCM CodeMirror</h1>
      </div>

      {/* Main content */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">
          Welcome, {admin ? `${admin.FirstName} ${admin.LastName}` : "Admin"}
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow flex items-center gap-4">
            <Users className="text-indigo-600 w-10 h-10" />
            <div>
              <h3 className="text-lg font-semibold">Total Students</h3>
              <p className="text-3xl mt-1">{totalStudents}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow flex items-center gap-4">
            <FileText className="text-emerald-600 w-10 h-10" />
            <div>
              <h3 className="text-lg font-semibold">Total Submissions</h3>
              <p className="text-3xl mt-1">{totalSubmissions}</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Departmental Breakdown</h3>
          <div className="w-full h-[300px] sm:h-[400px]">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom" },
                },
                scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: Math.ceil(
                          Math.max(...Object.values(departmentData)) / 5 / 10
                        ) * 10 || 10, 
                      },
                    },
                  },

              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
