import { FaExclamationTriangle, FaHome } from "react-icons/fa";

export default function AlreadySubmitted() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <FaExclamationTriangle size={26} />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-navy-900">
          You have already submitted
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Only one submission is accepted per practical. Your work has been
          recorded and is being graded.
        </p>
        <ul className="mb-7 space-y-2 text-left text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-gold-500">•</span>
            Multiple submissions for the same paper are not permitted.
          </li>
          <li className="flex gap-2">
            <span className="text-gold-500">•</span>
            Further attempts are flagged for review.
          </li>
          <li className="flex gap-2">
            <span className="text-gold-500">•</span>
            Please return for the next practical.
          </li>
        </ul>
        <button
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
        >
          <FaHome />
          Back to login
        </button>
      </div>
    </div>
  );
}
