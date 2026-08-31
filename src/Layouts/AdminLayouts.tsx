// Layouts/AdminLayout.tsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      {/* pt-16 clears the fixed mobile top bar; the sidebar is in flow on desktop.
          min-w-0 stops wide tables from forcing the whole page to scroll. */}
      <main className="min-w-0 flex-1 px-4 pt-20 pb-10 sm:px-6 lg:px-8 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
