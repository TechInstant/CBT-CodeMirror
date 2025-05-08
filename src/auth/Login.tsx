import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock } from "react-icons/fa";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useFormik } from "formik";
import * as Yup from "yup";
import { app } from "../firebase";
import axios from "axios";
import { baseUrl, GetToken } from "../App";
import { SignUpForm } from "./adminSignup";
import { StudentsContext } from "../Context/StudentContext";
import { useQuestions } from "../Context/QuestionContext";

const auth = getAuth(app);

export interface User {
  StudentId: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Email?: string;
  Role: string;
  Password: string;
  Reset?: string;
  Scores?: number;
}

export interface Admin {
  UserId: string;
  FirstName: string;
  LastName: string;
  Department: string;
  Email?: string;
  Role: string;
}

const Login: React.FC = () => {
  const { fetchAndAssignRandomQuestions, getActiveQuestion } = useQuestions();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showSignUp, setShowSignUp] = useState(false);
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const studentContext = useContext(StudentsContext);
  const studentData = studentContext?.students || [];

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const idToken = await GetToken();
        const adminResponse = await axios.get<Admin[]>(`${baseUrl}/users`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        setAdminData(adminResponse.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  const formik = useFormik({
    initialValues: { username: "", password: "" },
    validationSchema: Yup.object({
      username: Yup.string().required("Matric Number is required"),
      password: Yup.string().required("Password is required"),
    }),

    onSubmit: async (values) => {
      setError("");

      if (loading) {
        setError("Data is still loading. Please wait...");
        return;
      }

      const isAdmin = values.username.includes("@");

      if (isAdmin) {
        if (!adminData || adminData.length === 0) {
          setError("Admin data is missing. Try again later.");
          return;
        }
        const matchedAdmin = adminData.find(
          (user) => user.Email === values.username
        );
        if (!matchedAdmin) {
          setError("Account not found. Please check your email or sign up.");
          setShowSignUp(true);
          return;
        }
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            values.username,
            values.password
          );
          console.log("Admin signed in:", userCredential.user);
          localStorage.setItem("userData", JSON.stringify(matchedAdmin));
          navigate("/AdminDashboard");
        } catch (authError) {
          // console.log("Sign-in failed:", authError);
          setError("Invalid email or password.");
        }
      } else {
        if (!studentData || studentData.length === 0) {
          setError("Student data is missing. Try again later.");
          return;
        }
        const matchedStudent = studentData.find(
          (user) =>
            user.StudentId === values.username &&
            user.LastName.toLowerCase() === values.password.toLowerCase()
        );
        if (matchedStudent) {
          localStorage.setItem("userData", JSON.stringify(matchedStudent));

          const assignActiveQuestion = async () => {
            const activeQuestion = getActiveQuestion(); 
            
            if (activeQuestion) {
              await fetchAndAssignRandomQuestions(activeQuestion.QuestionsId);
            } else {
              setError("No active question found for this student.");
            }
          };

          await assignActiveQuestion(); 
          navigate("/welcomePage");
        } else {
          setError("Account not found or wrong credentials.");
        }
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full bg-blue-400 py-4 text-center text-white text-xl font-bold">
        CSC-M
      </div>
  
      <div className="relative w-full flex justify-center my-4">
        <img src="/oau.png" alt="logo" className="w-24 md:w-32 opacity-70" />
      </div>
  
      {showSignUp ? (
        <div className="w-full max-w-md px-4">
          <SignUpForm />
          <button
            className="mt-4 text-blue-600 underline text-sm"
            onClick={() => setShowSignUp(false)}
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md p-6 sm:p-8 bg-blue-50 rounded-lg shadow-md mt-6 sm:mt-10">
          <p className="text-center text-lg font-semibold text-gray-900 mb-4">
            LOGIN
          </p>
          <form className="space-y-4" onSubmit={formik.handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username Matric No.
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                  <FaUser />
                </span>
                <input
                  type="text"
                  name="username"
                  className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  placeholder="Enter your matric number"
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
  
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                  <FaLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  placeholder="Enter password"
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
  
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
  
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Login
            </button>
          </form>
        </div>
      )}
    </div>
  );
  
};

export default Login;
