import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, LogOut, Play } from "lucide-react";
import LogoutModal from "../auth/LogoutModal";
import { Student } from "../Context/StudentContext";
import { useQuestions } from "../Context/QuestionContext";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<Student | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const { questions, loading } = useQuestions();

  const activeId = localStorage.getItem("activeQuestionsId");
  const activeCourseFromContext = questions.find((q) => q.isActive);
  const activeCourse =
    questions.find((q) => q.QuestionsId === activeId) || activeCourseFromContext;

  useEffect(() => {
    const stored = localStorage.getItem("userData");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userData");
    setIsModalOpen(false);
    navigate("/");
  };

  const courseTitle = activeCourse
    ? activeCourse.CourseTitle
    : loading
    ? "Loading…"
    : "No Course Available";

  const rules = [
    "This session is monitored.",
    "Copying and pasting is disabled in the editor.",
    "Leaving or switching tabs submits your work automatically.",
    "You may submit each paper once.",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex items-center gap-3 bg-navy-900 px-4 py-3">
        <img src="/oau.png" alt="" className="h-8 w-8" />
        <span className="flex-1 text-sm font-semibold text-white">
          CSCM CodeMirror
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-navy-100/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Welcome
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-navy-900">
              {user ? `${user.FirstName} ${user.LastName}` : "Student"}
            </h1>

            <dl className="mt-6 grid grid-cols-1 gap-4 border-y border-slate-100 py-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Matric number
                </dt>
                <dd className="mt-0.5 font-mono text-sm text-navy-900">
                  {user?.StudentId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Department
                </dt>
                <dd className="mt-0.5 text-sm text-navy-900">
                  {user?.Department || "Not available"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Paper
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-navy-900">
                  {courseTitle}
                  {activeCourse && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      · {activeCourse.Duration} minutes
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!activeCourse}
              onClick={() =>
                activeCourse && navigate("/editor", { state: { courseTitle } })
              }
            >
              <Play className="h-4 w-4" />
              {activeCourse ? "Start coding" : "No active paper"}
            </button>
            {activeCourse && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Your timer starts as soon as you open the editor.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gold-800">
              <AlertTriangle className="h-4 w-4" />
              Before you begin
            </p>
            <ul className="space-y-1.5 text-sm text-gold-800/90">
              {rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden>•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <LogoutModal onClose={() => setIsModalOpen(false)} onConfirm={handleLogout} />
      )}

      {/* Same rules, shown once on small screens where the panel is easy to miss */}
      {showWarning && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-navy-950/50 p-4 md:hidden">
          <div className="w-full max-w-sm rounded-xl bg-white p-6">
            <p className="mb-4 flex items-center gap-2 font-semibold text-gold-700">
              <AlertTriangle className="h-5 w-5" />
              Before you begin
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              {rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden>•</span>
                  {r}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowWarning(false)}
              className="mt-6 w-full rounded-lg bg-navy-700 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomePage;
