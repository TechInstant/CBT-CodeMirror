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

const navItems = [
  { to: "/AdminDashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/StudentList", label: "Students", Icon: Users },
  { to: "/AdminUpload", label: "Upload", Icon: UploadCloud },
  { to: "/QuestionsList", label: "Questions", Icon: HelpCircle },
  { to: "/StudentScores", label: "Student Scores", Icon: FileText },
];

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem("admin-sidebar-open");
    return stored === null ? true : JSON.parse(stored);
  });

  useEffect(() => {
    localStorage.setItem("admin-sidebar-open", JSON.stringify(isOpen));
  }, [isOpen]);

  const admin = (() => {
    try {
      return JSON.parse(localStorage.getItem("userData") || "{}");
    } catch {
      return {};
    }
  })();

  const initials =
    `${admin.FirstName?.[0] ?? ""}${admin.LastName?.[0] ?? ""}`.toUpperCase() || "A";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/10 text-white"
        : "text-navy-100/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 z-50 flex w-full items-center gap-3 border-b border-navy-800 bg-navy-900 px-4 py-3 lg:hidden">
        <button
          onClick={() => setIsOpen((prev: boolean) => !prev)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="rounded-md p-1 text-navy-100 hover:bg-white/10"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <img src="/oau.png" alt="" className="h-7 w-7" />
        <span className="text-sm font-semibold text-white">CSCM CodeMirror</span>
      </div>

      {/* Dim the page behind the drawer on mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
        />
      )}

      {/* lg:sticky keeps the nav in place while the page scrolls; h-screen +
          top-0 is what makes sticky actually pin rather than scroll away. */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col bg-navy-900
          transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:self-start
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src="/oau.png" alt="OAU crest" className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">CSCM CodeMirror</p>
            <p className="truncate text-xs text-navy-200/60">Admin Panel</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {({ isActive }) => (
                <>
                  {/* Gold rail marks the active page, picking up the crest ribbon */}
                  <span
                    className={`absolute left-0 h-6 w-1 rounded-r-full bg-gold-400 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Signed-in admin + sign out */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-xs font-bold text-navy-900">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {admin.FirstName ? `${admin.FirstName} ${admin.LastName ?? ""}` : "Admin"}
              </p>
              <p className="truncate text-xs text-navy-200/60">{admin.Email ?? ""}</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/";
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
              text-navy-100/70 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
