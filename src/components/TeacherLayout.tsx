import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  NotepadText,
  PanelLeftClose,
  PanelLeftOpen,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TeacherLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  tooltip: string;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      path: "/teacher",
      icon: <LayoutDashboard className="h-5 w-5" />,
      tooltip: "Overview of your organization's activity and key metrics",
    },
    {
      name: "Students",
      path: "/teacher/students",
      icon: <Users className="h-5 w-5" />,
      tooltip: "View and manage students in your organization",
    },
    {
      name: "Assignments",
      path: "/teacher/assignments",
      icon: <NotepadText className="h-5 w-5" />,
      tooltip: "Review and grade assignment submissions from your students",
    },
    {
      name: "Announcements",
      path: "/teacher/announcements",
      icon: <Megaphone className="h-5 w-5" />,
      tooltip: "Create announcements visible only to your organization",
    },
    {
      name: "Courses",
      path: "/teacher/courses",
      icon: <BookOpen className="h-5 w-5" />,
      tooltip: "Browse courses and track student progress",
    },
    {
      name: "Comments",
      path: "/teacher/comments",
      icon: <MessageSquareText className="h-5 w-5" />,
      tooltip: "Moderate comments from students in your organization",
    },
    {
      name: "Statistics",
      path: "/teacher/statistics",
      icon: <BarChart3 className="h-5 w-5" />,
      tooltip: "View detailed learning statistics and progress analytics",
    },
    // {
    //   name: "Bulk Upload Students",
    //   path: "/teacher/bulk-upload",
    //   icon: <UserPlus className="h-5 w-5" />,
    //   tooltip: "Upload a CSV file to create multiple student accounts at once",
    // },
  ];

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
    if (path === "/teacher") {
      return location.pathname === "/teacher";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 border-b bg-card">
        <h1 className="text-lg font-bold">Teacher</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              "fixed sm:static inset-0 sm:inset-auto flex flex-col z-40 transition-all duration-300 ease-in-out bg-white dark:bg-neutral-900",
              "border-r border-primary/10 dark:border-primary/20",
              collapsed ? "sm:w-[68px]" : "sm:w-64",
              sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
            )}
          >
            {/* Collapse toggle button (desktop only) */}
            <div className="hidden sm:flex items-center justify-end p-2 border-b border-primary/10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  >
                    {collapsed ? (
                      <PanelLeftOpen className="h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{collapsed ? "Expand sidebar" : "Collapse sidebar"} (Ctrl+B)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <nav className="relative z-10 flex-1 p-2 overflow-y-auto mt-14 sm:mt-0 scrollbar-hide">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute right-5 top-2 p-0 rounded-full hover:bg-accent hover:text-accent-foreground mt-4 text-black sm:hidden border bg-white hover:bg-sky-600"
              >
                <X className="h-5 w-5" />
              </button>
              <ul className="space-y-1">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                            collapsed && "sm:justify-center sm:px-2",
                            isActive(item.path)
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {item.icon}
                          <span className={cn(collapsed && "sm:hidden")}>{item.name}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="hidden sm:block max-w-xs">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </nav>
            <div className={cn("p-2 border-t", collapsed && "sm:px-1.5")}>
              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground bg-red-500 hover:bg-red-600 text-white",
                      collapsed && "sm:justify-center sm:px-2 sm:gap-0"
                    )}
                  >
                    <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                    <span className={cn(collapsed && "sm:hidden")}>LogOut</span>
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="hidden sm:block">
                    <p>LogOut</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide">{children}</main>
        </div>
      </div>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TeacherLayout;
