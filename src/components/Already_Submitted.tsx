
import { FaExclamationTriangle, FaHome } from "react-icons/fa";

export default function AlreadySubmitted() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 text-center">
        <div className="text-red-500 mb-4">
          <FaExclamationTriangle size={48} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
          Hold on! 🚫
        </h1>
        <p className="text-gray-600 mb-6">
          It looks like you’ve already submitted your practical for today.  
          To keep things fair and secure, only one submission is allowed every practical&nbsp;hours.
        </p>
        <ul className="text-left text-gray-700 mb-6 space-y-2">
          <li>• Multiple submissions in a single practical are not permitted.</li>
          <li>• Attempting again will be flagged for review.</li>
          <li>• Please return for the next practical.</li>
        </ul>
        <button
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition"
        >
          <FaHome className="mr-2" />
          Back to Login
        </button>
      </div>
    </div>
  );
}
