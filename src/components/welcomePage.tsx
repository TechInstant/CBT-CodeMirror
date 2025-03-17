import { useNavigate } from "react-router-dom";
import { useState } from "react";
import LogoutModal from "../auth/LogoutModal"; 

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  const handleLogout = () => {
    closeModal();
    navigate("/studentLogin"); 
  };

  return (
    <div className="flex h-screen relative">
      {/* Sidebar */}
      <div className="w-1/4 bg-blue-600 p-4 flex flex-col space-y-4 min-h-screen">
        <button className="w-full py-2 bg-white text-gray-700 rounded-md" onClick={() => navigate("/studentLogin")}>
          Home
        </button>
        <button className="w-full py-2 bg-white text-gray-700 rounded-md font-semibold">
          Practice Questions
        </button>
        {/* <button className="w-full py-2 bg-white text-gray-700 rounded-md">Profile</button> */}
        <button className="w-full py-2 bg-white text-gray-700 rounded-md" onClick={openModal}>
          Log out
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-0">
        <div className="w-2/3">
          <h1 className="text-2xl font-semibold mb-6">Welcome Nuel</h1>
          <button 
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => navigate("/codesection")} 
          >
            Start Practicing
          </button>
        </div>
      </div>

      {/* Show Modal Only When isModalOpen is True */}
      {isModalOpen && <LogoutModal onClose={closeModal} onConfirm={handleLogout} />}
    </div>
  );
};

export default WelcomePage;
