import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
//import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { useFormik } from "formik";
import * as Yup from "yup";
import { app } from "../firebase";
import axios from "axios";
import { GetToken } from "../App";
import { SignUpForm } from "./adminSignup";

const auth = getAuth(app);
// const db = getFirestore(app);

interface User {
  UserId: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Email?: string;
  Role: string;
}

const StudentLogin: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<User[]>([]);
  const [showSignUp, setShowSignUp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const GetUser = async () => {
      try {
        const idToken = await GetToken(); // Ensure GetToken() is defined and properly imported

        const response = await axios.get<User[]>(
          "https://doyenifycbt-enas3l3ehq-uc.a.run.app/users",
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    GetUser(); // Call the function inside useEffect
  }, []);

  const formik = useFormik({
    initialValues: { username: "", password: "" },
    validationSchema: Yup.object({
      username: Yup.string().required("Username or Email is required"),
      password: Yup.string().required("Password is required"),
    }),

    onSubmit: async (values) => {
      setError("");
    
      const isAdmin = values.username.includes("@"); 
    
      if (isAdmin) {
        const matchedUser = data.find(user => user.Email === values.username);
    
        if (!matchedUser) {
          setError("Account not found. Please check your email or sign up.");
          setTimeout(() => {
            setShowSignUp(true);
          }, 1500);
          return;
        }
    
        // Proceed with Firebase authentication
        try {
          await signInWithEmailAndPassword(auth, values.username, values.password);
          navigate("/adminupload"); 
        } catch (authError) {
          setError("Invalid email or password.");
        }
      } else {
        const matchedUser = data.find(
          (user) =>
            user.LastName.toLowerCase() === values.username.toLowerCase() &&
            user.UserId === values.password
        );
    
        if (matchedUser) {
          navigate("/welcomepage");
        } else {
          setError("Invalid username or password.");
        }
      }
    },
    
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full bg-blue-600 py-4 text-center text-white text-xl font-bold">
        CBT
      </div>

      {showSignUp ? (
  <div>
    <SignUpForm />
    <button
      className="mt-4 text-blue-600 underline"
      onClick={() => setShowSignUp(false)}
    >
      Back to Login
    </button>
  </div>
) : (
  <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
    <p className="text-center text-lg font-semibold text-gray-900 mb-4">
      LOGIN
    </p>

    <form className="space-y-4" onSubmit={formik.handleSubmit}>
      {/* Username Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Username (Surname) or Email
        </label>
        <div className="relative mt-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
            <FaUser />
          </span>
          <input
            type="text"
            name="username"
            className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter your username or email"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.username}
            required
          />
        </div>
        {formik.touched.username && formik.errors.username && (
          <p className="text-red-500 text-sm mt-1">
            {formik.errors.username}
          </p>
        )}
      </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password (Matric No.)
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                  <FaLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g., CSC/2000/100"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  required
                />
                <span
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                </span>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {formik.errors.password}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Login
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentLogin;
