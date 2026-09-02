import React, { ReactNode } from "react";
import { FaSpinner } from "react-icons/fa";

/*
  Shared admin primitives. Every admin page previously styled its own buttons,
  tables and cards inline, which is why nothing quite matched. These are the
  single source of truth for those surfaces.
*/

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ className?: string; children: ReactNode }> = ({
  className = "",
  children,
}) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; actions?: ReactNode }> = ({
  title,
  actions,
}) => (
  // Wraps rather than overflowing: some headers carry three buttons, which do
  // not fit beside the title on a phone.
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
      {title}
    </h2>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-navy-700 text-white hover:bg-navy-800 focus-visible:outline-navy-700",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-navy-700",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-navy-800 focus-visible:outline-navy-700",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-red-600",
  gold:
    "bg-gold-400 text-navy-900 hover:bg-gold-500 focus-visible:outline-gold-600",
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md";
  }
> = ({ variant = "primary", size = "md", className = "", children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
      ${size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"}
      ${buttonVariants[variant]} ${className}`}
  >
    {children}
  </button>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...rest
}) => (
  <input
    {...rest}
    className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800
      placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2
      focus:ring-navy-500/20 ${className}`}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = "",
  children,
  ...rest
}) => (
  <select
    {...rest}
    className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800
      focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20 ${className}`}
  >
    {children}
  </select>
);

export const Badge: React.FC<{
  tone?: "navy" | "gold" | "green" | "slate" | "red";
  children: ReactNode;
}> = ({ tone = "slate", children }) => {
  const tones = {
    navy: "bg-navy-50 text-navy-700 ring-navy-200",
    gold: "bg-gold-50 text-gold-800 ring-gold-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

/*
  Wraps tables so they scroll inside the card rather than moving the page. Pass
  maxHeight to add vertical scrolling; the header stays pinned via sticky Th, so
  long rosters keep their column labels in view.
*/
export const TableWrap: React.FC<{
  children: ReactNode;
  maxHeight?: string;
  /** Narrowest the table may get before the wrapper scrolls instead. */
  minWidth?: string;
}> = ({ children, maxHeight, minWidth = "44rem" }) => (
  <div
    className="-mx-px overflow-auto"
    style={maxHeight ? { maxHeight } : undefined}
  >
    {/*
      w-full alone let the table compress to the width of a phone, squeezing
      columns until they were unreadable rather than scrolling. A minimum width
      keeps the columns legible and lets the wrapper scroll horizontally, which
      is what overflow-auto was there for.
    */}
    <table
      className="w-full border-collapse text-sm"
      style={{ minWidth }}
    >
      {children}
    </table>
  </div>
);

export const Th: React.FC<{ children?: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <th
    className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3
      text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
  >
    {children}
  </th>
);

export const Td: React.FC<{
  children?: ReactNode;
  className?: string;
  colSpan?: number;
}> = ({ children, className = "", colSpan }) => (
  <td
    colSpan={colSpan}
    className={`border-b border-slate-100 px-4 py-3 text-slate-700 ${className}`}
  >
    {children}
  </td>
);

export const EmptyState: React.FC<{
  title: string;
  hint?: string;
  icon?: ReactNode;
}> = ({ title, hint, icon }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
    {icon && <div className="mb-1 text-slate-300">{icon}</div>}
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {hint && <p className="max-w-sm text-sm text-slate-400">{hint}</p>}
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = "Loading" }) => (
  <div className="flex items-center justify-center gap-3 px-6 py-16 text-slate-500">
    <FaSpinner className="animate-spin text-xl text-navy-700" />
    <span className="text-sm">{label}…</span>
  </div>
);

export const Modal: React.FC<{
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}> = ({ title, children, onClose, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4">
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-slate-600">{children}</div>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
        {footer ?? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  </div>
);
