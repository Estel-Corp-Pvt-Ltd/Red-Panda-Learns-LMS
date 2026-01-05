import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Clipboard, LayoutDashboard, LogOut, Upload, UserIcon } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "Quizzes",
    path: "/quizzes",
    icon: <Clipboard className="h-5 w-5" />,
  },
  {
    name: "Submissions",
    path: "/submissions",
    icon: <Upload className="h-5 w-5" />,
  },
  {
    name: "Profile",
    path: "/profile",
    icon: <UserIcon className="h-5 w-5" />,
  },
];

const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };


 
const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="w-64 flex-col border-r bg-card overflow-y-auto hidden md:flex">
      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                   isActive(item.path)
                    ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
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

      {/* Logout Button */}
      <div className="p-4 border-t">
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm font-medium transition-all",
            "bg-red-500 text-white hover:bg-red-600"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

/**
 * Mobile toggle for user sidebar
 * - Shows an arrow icon button (instead of hamburger)
 * - Use this in your mobile header (md:hidden)
 */
export const UserSidebarMobileToggle: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sheet>
      {/* Arrow button on the right (like your Admin screenshot but arrow) */}
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden rounded-xl"
          aria-label="Open menu"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.name}>
                  <SheetClose asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                        isActive(item.path)
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  </SheetClose>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t">
            <button
              className={cn(
                "flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm font-medium transition-all",
                "bg-red-500 text-white hover:bg-red-600"
              )}
              onClick={async () => {
                await handleLogout();
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
