// Layouts/AdminLayout.tsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

const AdminLayout = () => {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <Outlet /> {/* This renders the page content */}
      </main>
    </div>
  );
};

export default AdminLayout;
