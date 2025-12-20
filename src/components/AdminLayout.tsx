import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AlarmClockPlus,
  Award,
  Book,
  BookOpen,
  Building2,
  ChartBar,
  ClipboardList,
  FilePenLine,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  NotepadText,
  PictureInPicture,
  ShoppingBag,
  TicketPercent,
  UserPen,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Statistics",
      path: "/admin/statistics",
      icon: <ChartBar className="h-5 w-5" />,
    },
    {
      name: "Courses",
      path: "/admin/courses",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      name: "Bundles",
      path: "/admin/bundles",
      icon: <Book className="h-5 w-5" />,
    },
    {
      name: "Assignment Submissions",
      path: "/admin/submissions",
      icon: <NotepadText className="h-5 w-5" />,
    },
    {
      name: "Assignment Manager",
      path: "/admin/manage-assignment-authors",
      icon: <FilePenLine className="h-5 w-5" />,
    },
    {
      name: "Admin Assign Students",
      path: "/admin/assign-students",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      name: "Coupons",
      path: "/admin/coupons",
      icon: <TicketPercent className="h-5 w-5" />,
    },
    {
      name: "Orders",
      path: "/admin/orders",
      icon: <ShoppingBag className="h-5 w-5" />,
    },
    {
      name: "Enrollments",
      path: "/admin/enrollments",
      icon: <AlarmClockPlus className="h-5 w-5" />,
    },
    {
      name: "Pop-Ups",
      path: "/admin/pop-ups",
      icon: <PictureInPicture className="h-5 w-5" />,
    },
    {
      name: "Instructors",
      path: "/admin/instructors",
      icon: <UserPen className="h-5 w-5" />,
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Reset Password",
      path: "/admin/reset-password",
      icon: <KeyRound className="h-5 w-5" />,
    },
    {
      name: "Organizations",
      path: "/admin/organizations",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      name: "Enroll Student",
      path: "/admin/enroll-student",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      name: "Announcements",
      path: "/admin/announcements",
      icon: <Megaphone className="h-5 w-5" />,
    },
    {
      name: "Banners",
      path: "/admin/banners",
      icon: <PictureInPicture className="h-5 w-5" />,
    },
    {
      name: "Bulk Enroll Students",
      path: "/admin/bulk-student-enroll",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      name: "Arrange Courses",
      path: "/admin/arrange-courses",
      icon: <ListOrdered className="h-5 w-5" />,
    },
    {
      name: "View Complaints",
      path: "/admin/view-complaints",
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      name: "Comments",
      path: "/admin/comments",
      icon: <MessageSquareText className="h-5 w-5" />,
    },
    {
      name: "Certificate Requests",
      path: "/admin/certificate-requests",
      icon: <Award className="h-5 w-5" />,
    },
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
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      {/* Mobile Header */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 border-b bg-card">
        <h1 className="text-lg font-bold">Admin</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={cn(
            "fixed sm:static inset-0 sm:inset-auto sm:w-64 flex flex-col z-40 transition-transform duration-300 ease-in-out bg-white dark:bg-neutral-900",
            "border-r border-primary/10 dark:border-primary/20",
            sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          )}
        >
          <nav className="relative z-10 flex-1 p-4 overflow-y-auto mt-14 sm:mt-0 scrollbar-hide">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-5 top-2 p-0 rounded-full hover:bg-accent hover:text-accent-foreground mt-4 text-black sm:hidden border bg-white hover:bg-sky-600"
            >
              <X className="h-5 w-5" />
            </button>
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t">
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground bg-red-500 hover:bg-red-600 text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              LogOut
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            {children}
          </main>
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

export default AdminLayout;
