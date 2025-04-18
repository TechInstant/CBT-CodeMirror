import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LogoutModal from "../auth/LogoutModal"; 
import { Student } from "../Context/StudentContext";
import { useQuestions } from "../Context/QuestionContext";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<Student | null>(null);
  const { questions, loading } = useQuestions();
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  useEffect(() => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
      const storedUser: Student = JSON.parse(storedData);
      setUser(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userData");
    closeModal();
    navigate("/"); 
  };

  
  const activeId = localStorage.getItem("activeQuestionId");
  const activeCourse = questions.find((q) => q.questionId === activeId);
  const courseTitle = activeCourse
    ? activeCourse.CourseTitle
    : loading
      ? "Loading…"
      : "No Course Available";

  const handleStartCoding = () => {
    navigate("/codesection", { state: { courseTitle } });
  };

  return (
    <div className="flex h-screen relative">
      <div className="w-1/4 bg-blue-600 p-4 flex flex-col space-y-4 min-h-screen">
        <button
          className="w-full py-2 bg-white text-gray-700 rounded-md"
          onClick={() => navigate("/")}
        >
          Home
        </button>
        <button className="w-full py-2 bg-white text-gray-700 rounded-md font-semibold">
          Practice Questions
        </button>
        <button
          className="w-full py-2 bg-white text-gray-700 rounded-md"
          onClick={openModal}
        >
          Log out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-0">
        <div className="w-2/3 bg-white p-6 rounded-lg shadow-lg">
          <p className="text-center text-2xl font-bold mb-4">Welcome</p>
          <p className="text-lg font-semibold">
            Name: {user ? `${user.FirstName} ${user.LastName}` : "Student"}
          </p>
          <p className="text-lg font-semibold">
            Department: {user?.Department || "Not Available"}
          </p>
          <div className="mt-4">
            {/* <p className="text-lg font-medium">Course Title:</p> */}
            <p className="text-xl font-bold">{courseTitle}</p>
          </div>
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 mt-4"
            onClick={handleStartCoding}
          >
            Start Coding
          </button>
        </div>
      </div>
      {isModalOpen && <LogoutModal onClose={closeModal} onConfirm={handleLogout} />}
      {/* Warning Box */}
<div className="absolute bottom-4 right-4 bg-red-100 text-red-800 border border-red-300 p-4 rounded-lg shadow-md text-sm max-w-xs z-10">
  <p className="font-semibold mb-1">⚠️ Monitoring Notice</p>
  <ul className="list-disc list-inside space-y-1 text-left">
    <li>This exam is being monitored.</li>
    <li>Your camera is on.</li>
    <li>Changing tabs will auto-submit and log you out.</li>
  </ul>
</div>

    </div>
  );
};

export default WelcomePage;
