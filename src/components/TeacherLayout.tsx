import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  NotepadText,
  Users,
} from "lucide-react";
import React, { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { CircularNav, CircularNavItem } from "@/components/ui/CircularNav";

/* ─── Types ───────────────────────────────────────── */

interface TeacherLayoutProps {
  children: ReactNode;
}

/* ─── Menu data ───────────────────────────────────── */

const circularItems: CircularNavItem[] = [
  {
    name: "Dashboard",
    path: "/teacher",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "Students",
    path: "/teacher/students",
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: "Assignments",
    path: "/teacher/assignments",
    icon: <NotepadText className="h-5 w-5" />,
  },
  {
    name: "Announcements",
    path: "/teacher/announcements",
    icon: <Megaphone className="h-5 w-5" />,
  },
  {
    name: "Courses",
    path: "/teacher/courses",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    name: "Comments",
    path: "/teacher/comments",
    icon: <MessageSquareText className="h-5 w-5" />,
  },
  {
    name: "Statistics",
    path: "/teacher/statistics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

/* ═══════════════════ Component ═══════════════════════ */

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
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
    if (path === "/teacher") return location.pathname === "/teacher";
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
        centerLabel="Teacher"
      />
    </div>
  );
};

export default TeacherLayout;
