import React from "react";

interface LogoutModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 flex justify-center items-center z-50">
      {/* Modal Container */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 w-96">
        <p className="text-lg font-semibold text-center">Confirm Logout</p>
        <p className="text-gray-600 text-center mt-2">
          Are you sure you want to log out?
        </p>

        {/* Buttons: Properly Centered */}
        <div className="mt-4 flex justify-center gap-4">
          <button
            className="px-5 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
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
