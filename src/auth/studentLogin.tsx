import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

const StudentLogin: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  
  const isValidMatricNumber = (password: string) => {
    const regex = /^[A-Za-z]{3}\/\d{4}\/\d{3}$/;
    return regex.test(password);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!isValidMatricNumber(password)) {
      setError("Password must be in CSC/1999/100 format.");
      return;
    }

    setError(""); 
    navigate("/welcomepage"); 
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Header Section */}
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold ">
        CBT
      </div>
     

      
      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        <h2 className="text-center text-lg font-semibold text-gray-900 mb-4">
          STUDENT LOGIN
        </h2>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                <FaUser />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Password (Matric No.)</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                <FaLock />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g., CSC/2000/100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </span>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          {/* Forgot Password
          <div className="text-right text-sm">
            <a href="#" className="text-blue-500 hover:underline">Forgot password?</a>
          </div> */}

          {/* Login Button */}
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentLogin;
