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
        // An empty admin list is the normal state of a fresh project, not an
        // error. Falling through to sign-up is what lets the first admin be
        // created; bailing out here left a new deployment with no way in.
        const matchedAdmin = (adminData ?? []).find(
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
          navigate("/admindashboard");
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
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex items-center justify-center gap-3 bg-navy-900 px-4 py-3">
        <img src="/oau.png" alt="" className="h-8 w-8" />
        <span className="text-sm font-semibold tracking-wide text-white">
          CSCM CodeMirror
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {showSignUp ? (
          <div className="w-full max-w-md">
            <SignUpForm />
            <button
              className="mt-4 text-sm font-medium text-navy-700 underline hover:text-navy-800"
              onClick={() => setShowSignUp(false)}
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <img src="/oau.png" alt="OAU crest" className="mb-3 h-16 w-16" />
              <h1 className="text-xl font-semibold text-navy-900">Sign in</h1>
              <p className="mt-1 text-sm text-slate-500">
                Students use their matric number. Staff use their email address.
              </p>
            </div>

            <form className="space-y-4" onSubmit={formik.handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Matric number or email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <FaUser />
                  </span>
                  <input
                    type="text"
                    name="username"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                    placeholder="e.g. CSC/2021/001"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.username}
                    required
                  />
                </div>
                {formik.touched.username && formik.errors.username && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.username}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <FaLock />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                    placeholder="Enter password"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.password}</p>
                )}
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full rounded-lg bg-navy-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
              >
                {formik.isSubmitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400">
        For Learning and Culture
      </footer>
    </div>
  );

};

export default Login;
