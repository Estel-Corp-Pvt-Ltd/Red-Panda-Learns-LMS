import React, { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, Settings, Book, TicketPercent, Building2, ShoppingBag, UserPen, PictureInPicture, NotepadText, GrapeIcon, ChartBar ,Menu ,X } from 'lucide-react';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
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
      name: "Submissions",
      path: "/admin/submissions",
      icon: <NotepadText className="h-5 w-5" />,
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
      name: "Organizations",
      path: "/admin/organizations",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      name: "Enroll Student",
      path: "/admin/enroll-student",
      icon: <UserPen className="h-5 w-5" />,
    },
  ];

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
            "fixed sm:static inset-0 sm:inset-auto sm:w-64 flex flex-col border-r z-40 transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
          )}
        >
          {/* Background layer with adaptive glass effect */}
          <div
            className={cn(
              "absolute inset-0 sm:hidden backdrop-blur-2xl transition duration-300 ease-out",
              // light mode (default)
              "bg-white-10 border border-white/40 shadow-lg",
              // dark mode override
              "dark:bg-neutral-900/70 dark:border-white/10 dark:shadow-[0_0_20px_rgba(0,0,0,0.4)]"
            )}
          ></div>

          {/* Mobile close bar */}
          <div className="sm:hidden relative z-10 flex items-center justify-between px-4 py-3 bg-transparent border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="relative z-10 flex-1 p-4 overflow-y-auto">
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
