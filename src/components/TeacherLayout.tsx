import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Users,
  X,
} from "lucide-react";
import React, { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────── */

interface TeacherLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

/* ─── Sidebar data ────────────────────────────────── */

const navItems: NavItem[] = [
  { name: "Dashboard", path: "/teacher", icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: "My Courses", path: "/teacher/my-courses", icon: <GraduationCap className="h-5 w-5" /> },
  { name: "Student Progress", path: "/teacher/courses", icon: <BookOpen className="h-5 w-5" /> },
  { name: "Students", path: "/teacher/students", icon: <Users className="h-5 w-5" /> },
  { name: "Content Management", path: "/teacher/content-management", icon: <Lock className="h-5 w-5" /> },
  { name: "Statistics", path: "/teacher/statistics", icon: <BarChart3 className="h-5 w-5" /> },
  { name: "Announcements", path: "/teacher/announcements", icon: <Megaphone className="h-5 w-5" /> },
  { name: "Comments", path: "/teacher/comments", icon: <MessageSquareText className="h-5 w-5" /> },
];

/* ═══════════════════ Component ═══════════════════════ */

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const go = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-3 py-4">
        <span className="text-lg font-bold text-primary">Teacher</span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => go(item.path)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(item.path)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            <span>{item.name}</span>
          </button>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </button>
    </nav>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar (drawer) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card shadow-xl">
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="m-3 flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Menu
          </button>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default TeacherLayout;
