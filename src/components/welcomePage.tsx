import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LogoutModal from "../auth/LogoutModal"; 

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const [firstName, setFirstName] = useState<string | null>("");
  const [lastName, setLastName] = useState<string | null>("");
  const [Department, setDepartment] = useState<string | null>("");

  useEffect(() => {
    setFirstName(localStorage.getItem("FirstName"));
    setLastName(localStorage.getItem("LastName"));
    setDepartment(localStorage.getItem("Department"));
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem("FirstName");
    localStorage.removeItem("LastName");
    localStorage.removeItem("Department")
    closeModal();
    navigate("/studentLogin"); 
  };

  return (
    <div className="flex h-screen relative">
      {/* Sidebar */}
      <div className="w-1/4 bg-blue-600 p-4 flex flex-col space-y-4 min-h-screen">
        <button className="w-full py-2 bg-white text-gray-700 rounded-md" onClick={() => navigate("/")}>
          Home
        </button>
        <button className="w-full py-2 bg-white text-gray-700 rounded-md font-semibold">
          Practice Questions
        </button>
        <button className="w-full py-2 bg-white text-gray-700 rounded-md" onClick={openModal}>
          Log out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-0">
      <div className="w-2/3 bg-white p-6 rounded-lg shadow-lg">
          <p className="text-center text-2xl font-bold mb-4">Welcome</p>
          <p className="text-lg font-semibold">Name: {firstName ? `${firstName} ${lastName}` : "Student"}</p>
          <p className="text-lg font-semibold">Department: {Department ? Department : "Not Available"}</p>
          <button 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 p-2 mt-4"
            onClick={() => navigate("/codesection")} 
          >
            Start Practicing
          </button>
        </div>
      </div>
      {isModalOpen && <LogoutModal onClose={closeModal} onConfirm={handleLogout} />}
    </div>
  );
};

export default WelcomePage;
