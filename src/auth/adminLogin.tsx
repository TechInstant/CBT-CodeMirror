import React from "react";
import { FaUser, FaLock } from "react-icons/fa";
import { IoEyeOutline } from "react-icons/io5";

const AdminLogin: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        CM CodeMirror
      </div>

      {/* Login Container */}
      <div className="w-full max-w-md p-8 bg-white border rounded-lg shadow-md mt-6">
        <h2 className="text-center font-inter font-normal text-[#000000] mb-4">
          ADMIN LOGIN
        </h2>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username/Email</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                <FaUser />
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                <FaLock />
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Enter your password"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer">
                <IoEyeOutline />
              </span>
            </div>
          </div>

          <div className="text-right text-sm">
            <a href="#" className="text-blue-500 hover:underline">Forgot password?</a>
          </div>

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

export default AdminLogin;
