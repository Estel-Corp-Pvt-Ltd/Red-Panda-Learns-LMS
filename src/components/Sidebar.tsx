import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Clipboard,
  LayoutDashboard,
  Upload,
  UserIcon,
  Zap,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { CircularNav, CircularNavItem } from "@/components/ui/CircularNav";

/* ─── Menu data ───────────────────────────────────── */

const circularItems: CircularNavItem[] = [
  {
    name: "What's New",
    path: "/whats-new",
    icon: <Zap className="h-5 w-5" />,
  },
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

/* Helper */
const checkActive = (path: string, currentPath: string) => {
  if (path === "/dashboard") return currentPath === "/dashboard";
  return currentPath.startsWith(path);
};

/* ─── Sidebar = CircularNav only ──────────────────── */

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
    <CircularNav
      items={circularItems}
      onNavigate={(path) => navigate(path)}
      isActive={(path) => checkActive(path, location.pathname)}
      onLogout={handleLogout}
    />
  );
};

export default Sidebar;

/* Mobile toggle is no longer needed — CircularNav FAB handles it */
export const UserSidebarMobileToggle: React.FC = () => null;
