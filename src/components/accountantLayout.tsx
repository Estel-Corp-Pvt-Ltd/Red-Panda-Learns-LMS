import { useAuth } from "@/contexts/AuthContext";
import { ShoppingBag } from "lucide-react";
import React, { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { CircularNav, CircularNavItem } from "@/components/ui/CircularNav";

/* ─── Types ───────────────────────────────────────── */

interface AccountantLayoutProps {
  children: ReactNode;
}

/* ─── Menu data ───────────────────────────────────── */

const circularItems: CircularNavItem[] = [
  {
    name: "Orders",
    path: "/accountant",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
];

/* ═══════════════════ Component ═══════════════════════ */

const AccountantLayout: React.FC<AccountantLayoutProps> = ({ children }) => {
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
    if (path === "/accountant") return location.pathname === "/accountant";
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
        centerLabel="Accountant"
      />
    </div>
  );
};

export default AccountantLayout;
