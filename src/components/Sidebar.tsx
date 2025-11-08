import React from "react";
import { LayoutDashboard, FileText, Upload, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    // {
    //   name: "Invoices",
    //   path: "/invoices",
    //   icon: <FileText className="h-5 w-5" />
    // },
    {
      name: "Submissions",
      path: "/submissions",
      icon: <Upload className="h-5 w-5" />
    },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 flex flex-col border-r bg-card overflow-y-auto">
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
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
