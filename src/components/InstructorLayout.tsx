import { LayoutDashboard } from "lucide-react";
import React, { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { CircularNav, CircularNavItem } from "@/components/ui/CircularNav";

/* ─── Types ───────────────────────────────────────── */

interface InstructorLayoutProps {
  children: ReactNode;
}

/* ─── Menu data ───────────────────────────────────── */

const circularItems: CircularNavItem[] = [
  {
    name: "Dashboard",
    path: "/instructor",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
];

/* ═══════════════════ Component ═══════════════════════ */

const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      localStorage.clear();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/instructor") return location.pathname === "/instructor";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {children}
      </main>

      <CircularNav
        items={circularItems}
        onNavigate={(path) => navigate(path)}
        isActive={isActive}
        onLogout={handleLogout}
        centerLabel="Instructor"
      />
    </div>
  );
};

export default InstructorLayout;
