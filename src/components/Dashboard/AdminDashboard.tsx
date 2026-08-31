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
import { Users, FileText, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, PageHeader, EmptyState, Badge } from "../ui";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Admin {
  FirstName: string;
  LastName: string;
  Department?: string;
  Email?: string;
}

interface GradingStatus {
  totalAttempts: number;
  graded: number;
  pending: number;
  errors: Array<{ studentId: string; paperId: string; error: string }>;
}

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tint: string;
  hint?: string;
}> = ({ label, value, icon, tint, hint }) => (
  <Card className="p-5">
    <div className="flex items-start gap-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-navy-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  </Card>
);

const AdminDashboard = () => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [departmentData, setDepartmentData] = useState<{ [key: string]: number }>({});
  const [grading, setGrading] = useState<GradingStatus | null>(null);

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
        setTotalStudents(Array.isArray(students) ? students.length : 0);

        const submissionRes = await fetch(`${baseUrl}/submissions`, { headers });
        const submissions = await submissionRes.json();
        setTotalSubmissions(Array.isArray(submissions) ? submissions.length : 0);

        const departmentBreakdown: { [key: string]: number } = {};
        (Array.isArray(submissions) ? submissions : []).forEach((s: any) => {
          const dept = s.department || "Unknown";
          departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;
        });
        setDepartmentData(departmentBreakdown);

        // Grading runs out of band now, so how much is still queued is a live
        // number worth watching during a sitting.
        const gradingRes = await fetch(`${baseUrl}/submissions/grading-status`, { headers });
        if (gradingRes.ok) setGrading(await gradingRes.json());
      } catch (error) {
        console.error("Error loading dashboard:", error);
      }
    };

    fetchData();
  }, []);

  const departments = Object.keys(departmentData);
  const chartData = {
    labels: departments,
    datasets: [
      {
        label: "Submissions",
        data: Object.values(departmentData),
        backgroundColor: "#000080",
        hoverBackgroundColor: "#1a22a0",
        borderRadius: 6,
        maxBarThickness: 56,
      },
    ],
  };

  return (
    <>
      <PageHeader
        title={`Welcome, ${admin ? `${admin.FirstName} ${admin.LastName}` : "Admin"}`}
        subtitle="Overview of students, submissions and grading."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          icon={<Users className="h-5 w-5 text-navy-700" />}
          tint="bg-navy-50"
        />
        <StatCard
          label="Submissions"
          value={totalSubmissions}
          icon={<FileText className="h-5 w-5 text-gold-700" />}
          tint="bg-gold-50"
        />
        <StatCard
          label="Graded"
          value={grading ? grading.graded : "—"}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          tint="bg-emerald-50"
          hint={grading ? `of ${grading.totalAttempts} attempts` : undefined}
        />
        <StatCard
          label="Awaiting grading"
          value={grading ? grading.pending : "—"}
          icon={<Clock className="h-5 w-5 text-slate-600" />}
          tint="bg-slate-100"
          hint={
            grading && grading.pending > 0 ? "Grader runs every minute" : "Queue is clear"
          }
        />
      </div>

      {grading && grading.errors.length > 0 && (
        <Card className="mt-6 border-red-200">
          <CardHeader
            title="Grading errors"
            actions={<Badge tone="red">{grading.errors.length}</Badge>}
          />
          <ul className="divide-y divide-slate-100">
            {grading.errors.slice(0, 5).map((e, i) => (
              <li key={i} className="px-5 py-3 text-sm">
                <span className="font-medium text-navy-900">{e.studentId}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{e.error}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Submissions by department" />
        <div className="p-5">
          {departments.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              hint="Once students submit, the departmental breakdown appears here."
            />
          ) : (
            <div className="h-[300px] w-full sm:h-[380px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: "#64748b" } },
                    y: {
                      beginAtZero: true,
                      border: { display: false },
                      ticks: { precision: 0, color: "#64748b" },
                      grid: { color: "#e2e8f0" },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default AdminDashboard;
