import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  Users,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem("admin-sidebar-open");
    return stored === null ? true : JSON.parse(stored);
  });

  useEffect(() => {
    localStorage.setItem("admin-sidebar-open", JSON.stringify(isOpen));
  }, [isOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium ${
      isActive
        ? "bg-blue-100 text-blue-600"
        : "hover:bg-gray-100 text-gray-700"
    }`;

  return (
    <>
      {/* Top bar with Hamburger (Mobile Only) */}
      <div className="lg:hidden fixed top-0 left-0 z-50 w-full flex items-center justify-between bg-white shadow p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen((prev: boolean) => !prev)}
            className="text-gray-700 focus:outline-none"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold text-blue-600">Admin Panel</h1>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 bg-white border-r shadow-sm p-4 min-h-screen w-64 transform transition-transform duration-300 ease-in-out 
          ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static`}
      >
        {/* Admin Info */}
        {/*
        <div className="flex flex-col items-center mb-6">
          <img
            src="https://via.placeholder.com/80"
            alt="Admin"
            className="w-20 h-20 rounded-full mb-2 border"
          />
          <p className="text-sm font-semibold text-gray-700">Admin User</p>
        </div>
        */}

        {/* Navigation */}
        <nav className="flex flex-col gap-2 mt-10 lg:mt-4">
          <NavLink to="/AdminDashboard" className={linkClass}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          <NavLink to="/StudentList" className={linkClass}>
            <Users className="w-5 h-5" />
            Students
          </NavLink>
          <NavLink to="/AdminUpload" className={linkClass}>
            <UploadCloud className="w-5 h-5" />
            Upload
          </NavLink>
          <NavLink to="/QuestionsList" className={linkClass}>
            <HelpCircle className="w-5 h-5" />
            Questions
          </NavLink>
          <NavLink to="/StudentScores" className={linkClass}>
            <FileText className="w-5 h-5" />
            Student Scores
          </NavLink>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 mt-8"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </aside>
    </>
  );
}
