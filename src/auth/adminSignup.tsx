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


export const SignUpForm = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "", // Added email field
      role: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required("First name is required"),
      lastName: Yup.string().required("Last name is required"),
      email: Yup.string().email("Invalid email").required("Email is required"), // Validate email
      role: Yup.string().required("Role is required"),
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required(),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password")], "Passwords must match")
        .required(),
    }),
    onSubmit: async (values) => {
      try {
        setError(""); // Clear previous errors

        // Create Firebase Authentication account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
       

        // Get Firebase ID token for authentication
        const idToken = await userCredential.user.getIdToken();
        const firebaseUser = userCredential.user;

        // Prepare user data
        const newUser = {
          UserId: firebaseUser.uid,
          FirstName: values.firstName,
          LastName: values.lastName,
          Email: values.email,
          Role: values.role,
          Department: " "
        };

        // Send user data to the backend API
        await axios.post(
          "https://doyenifycbt-enas3l3ehq-uc.a.run.app/users",
          newUser,
          {
            headers: { Authorization: `Bearer ${idToken}` }, // Correct syntax
          }
        );

        navigate("/adminupload"); // Redirect after successful sign-up
      } catch (error) {
        console.error("Error creating user:", error);

        // If Firebase authentication succeeds but database request fails, delete the user
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }

        setError("Failed to create account");
      }
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md p-8 bg-blue-50 rounded-lg shadow-md mt-10">
        <p className="text-center text-lg font-semibold text-gray-900 mb-4">
          Sign up
        </p>
        <form onSubmit={formik.handleSubmit} className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
  {/* First Name & Last Name - Side by Side */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-gray-700 font-medium">First Name</label>
      <input
        type="text"
        name="firstName"
        value={formik.values.firstName}
        onChange={formik.handleChange}
        placeholder="Enter your first name"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      {formik.errors.firstName && <p className="text-red-600 text-sm mt-1">{formik.errors.firstName}</p>}
    </div>

    <div>
      <label className="block text-gray-700 font-medium">Last Name</label>
      <input
        type="text"
        name="lastName"
        value={formik.values.lastName}
        onChange={formik.handleChange}
        placeholder="Enter your last name"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      {formik.errors.lastName && <p className="text-red-600 text-sm mt-1">{formik.errors.lastName}</p>}
    </div>
  </div>

  {/* Email */}
  <div className="mt-4">
    <label className="block text-gray-700 font-medium">Email</label>
    <input
      type="email"
      name="email"
      value={formik.values.email}
      onChange={formik.handleChange}
      placeholder="Enter your email"
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
    />
    {formik.errors.email && <p className="text-red-600 text-sm mt-1">{formik.errors.email}</p>}
  </div>

  {/* Role as Input (Instead of Dropdown) */}
  <div className="mt-4">
    <label className="block text-gray-700 font-medium">Role</label>
    <input
      type="text"
      name="role"
      value={formik.values.role}
      onChange={formik.handleChange}
      placeholder="Enter your role (e.g., Admin)"
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
    />
    {formik.errors.role && <p className="text-red-600 text-sm mt-1">{formik.errors.role}</p>}
  </div>

  {/* Password & Confirm Password - Side by Side */}
  <div className="grid grid-cols-2 gap-4 mt-4">
    <div>
      <label className="block text-gray-700 font-medium">Password</label>
      <input
        type="password"
        name="password"
        value={formik.values.password}
        onChange={formik.handleChange}
        placeholder="Enter password"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      {formik.errors.password && <p className="text-red-600 text-sm mt-1">{formik.errors.password}</p>}
    </div>

    <div>
      <label className="block text-gray-700 font-medium">Confirm Password</label>
      <input
        type="password"
        name="confirmPassword"
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        placeholder="Confirm password"
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
      />
      {formik.errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{formik.errors.confirmPassword}</p>}
    </div>
  </div>

  {/* Error Message */}
  {error && <p className="text-red-600 text-sm text-center mt-2">{error}</p>}

  {/* Submit Button */}
  <button
    type="submit"
    className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
  >
    Create Account
  </button>
</form>

      </div>
    </div>
  );
};
