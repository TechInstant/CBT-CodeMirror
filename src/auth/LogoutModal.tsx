import React from "react";

interface LogoutModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-0 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center border border-gray-300">
        <h2 className="text-lg font-semibold text-gray-800">Confirm Logout</h2>
        <p className="text-gray-600 mt-2">Are you sure you want to log out?</p>
        <div className="flex justify-between mt-4">
          <button
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-700"
            onClick={onConfirm}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
