import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LogoutModal from "../auth/LogoutModal"; 
import { Student } from "../Context/StudentContext";
import { useQuestions } from "../Context/QuestionContext";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<Student | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const { questions, loading } = useQuestions();

  const activeId = localStorage.getItem("activeQuestionsId");
  const activeCourseFromContext = questions.find((q) => q.isActive);
  const activeCourse =
    questions.find((q) => q.QuestionsId === activeId) ||
    activeCourseFromContext;

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userData");
    setIsModalOpen(false);
    navigate("/");
  };

  const courseTitle = activeCourse
    ? activeCourse.CourseTitle
    : loading
    ? "Loading…"
    : "No Course Available";

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white/10">
      {/* Sidebar */}
      <nav className="w-full md:w-1/4 bg-blue-600/80 p-4 flex flex-col gap-2">
        <button
          className="w-full py-2 bg-white text-gray-700 rounded-md"
          onClick={() => navigate("/")}
        >
          Home
        </button>
        <button
          className="w-full py-2 bg-white text-gray-700 rounded-md font-semibold"
          onClick={() => navigate("/practice")}
        >
          Practice Questions
        </button>
        <button
          className="w-full py-2 bg-white text-gray-700 rounded-md"
          onClick={() => setIsModalOpen(true)}
        >
          Log out
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full md:w-2/3 bg-white/90 p-6 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome</h1>
          <p className="text-lg font-semibold">
            Name: {user ? `${user.FirstName} ${user.LastName}` : "Student"}
          </p>
          <p className="text-lg font-semibold">
            Department: {user?.Department || "Not Available"}
          </p>
          <h2 className="mt-4 text-xl font-bold">{courseTitle}</h2>
          <button
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            onClick={() =>
              activeCourse
                ? navigate("/editor", { state: { courseTitle } })
                : alert("No active course available.")
            }
          >
            Start Coding
          </button>
        </div>
      </main>

      {/* Logout Modal */}
      {isModalOpen && (
        <LogoutModal onClose={() => setIsModalOpen(false)} onConfirm={handleLogout}/>
      )}

      {/* Desktop Warning (bottom-right) */}
      <div className="hidden md:block absolute bottom-4 right-4 bg-red-100 text-red-800 border border-red-300 p-4 rounded-lg shadow-md text-sm max-w-xs">
        <p className="font-semibold mb-1">⚠️ Monitoring Notice</p>
        <ul className="list-disc list-inside space-y-1">
          <li>This exam is being monitored.</li>
          <li>Your camera is on.</li>
          <li>Changing tabs will auto-submit and log you out.</li>
        </ul>
      </div>

      {/* Mobile Warning Modal */}
      {showWarning && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:hidden z-20">
          <div className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold text-red-600">⚠️ Monitoring Notice</p>
              <button
                onClick={() => setShowWarning(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>This exam is being monitored.</li>
              <li>Your camera is on.</li>
              <li>Copying and pasting will be detected.</li>
              <li>Changing tabs will auto-submit and log you out.</li>
            </ul>
            <button
              onClick={() => setShowWarning(false)}
              className="mt-6 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
