import axios from "axios";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
} from "firebase/auth";
import { useFormik } from "formik";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { baseUrl } from "../App";

export const SignUpForm = () => {
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();
  const auth = getAuth();

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string().email("Invalid email").required("Email is required"),
      role: Yup.string().required("Role is required"),
      password: Yup.string()
        .min(8, "Password must be at least 8 characters")
        .required("Password is required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required("Confirm your password"),
    }),
    onSubmit: async (values) => {
      setError("");
      let firebaseUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        firebaseUser = userCredential.user;
      } catch (authErr: any) {
        console.error("Firebase signUp failed →", authErr.code, authErr.message);
        switch (authErr.code) {
          case "auth/email-already-in-use":
            setError("That email is already registered. Try logging in instead.");
            break;
          case "auth/invalid-email":
            setError("Please enter a valid email address.");
            break;
          case "auth/weak-password":
            setError("Password is too weak. It must be at least 8 characters.");
            break;
          case "auth/operation-not-allowed":
            setError("Email/Password sign-up is disabled in Firebase.");
            break;
          default:
            setError(`Firebase error: ${authErr.message}`);
        }
        return;
      }

      let idToken: string;
      try {
        idToken = await firebaseUser.getIdToken();
      } catch (tokenErr: any) {
        // console.error("Failed to get ID token →", tokenErr);
        try {
          await deleteUser(firebaseUser);
        } catch (delErr) {
          // console.error("Error deleting Firebase user after token failure →", delErr);
        }
        setError("Unable to verify authentication. Please try again.");
        return;
      }
      
      const newUser = {
        UserId: firebaseUser.uid,
        FirstName: values.firstName,
        LastName: values.lastName,
        Email: values.email,
        Role: values.role,
        Department: " ",
      };

      try {
        await axios.post(
          `${baseUrl}/users`,
          newUser,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        //On success, navigate straight to "/" (your login page)
        navigate("/AdminDashboard");
      } catch (backendErr: any) {
        // console.error(
        //   "Backend /users failed →",
        //   backendErr.response?.status,
        //   backendErr.response?.data
        // );
        // Delete the Firebase user to avoid orphaned accounts
        if (auth.currentUser) {
          try {
            await deleteUser(auth.currentUser);
          } catch (delErr) {
            // console.error("Error deleting Firebase user after backend failure →", delErr);
          }
        }
        if (backendErr.response && backendErr.response.data) {
          const backendData = backendErr.response.data;
          setError(
            backendData.error ||
            backendData.message ||
            `Backend error (status ${backendErr.response.status})`
          );
        } else {
          setError(backendErr.message );
        }
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-center text-2xl font-bold text-gray-800 mb-4">
          Sign Up
        </h2>
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {formik.touched.firstName && formik.errors.firstName && (
                <p className="text-red-600 text-sm">{formik.errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 font-medium">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {formik.touched.lastName && formik.errors.lastName && (
                <p className="text-red-600 text-sm">{formik.errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-600 text-sm">{formik.errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-medium">Role</label>
            <input
              type="text"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            {formik.touched.role && formik.errors.role && (
              <p className="text-red-600 text-sm">{formik.errors.role}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium">Password</label>
              <input
                type="password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-600 text-sm">{formik.errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-gray-700 font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="text-red-600 text-sm">{formik.errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {error && <p className="text-center text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
};
