import React from "react";
import { LayoutDashboard, FileText, Upload, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Invoices", icon: FileText, href: "/invoices" },
    { label: "Submissions", icon: Upload, href: "/submissions" },
  ];

  return (
    <aside
      className="w-64 flex flex-col justify-between border-r overflow-y-scroll
        bg-gray-50 text-gray-800 shadow-md
        dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800
      "
    >
      {/* Top Section */}
      <div>
        {/* Navigation */}
        <nav className="mt-4 flex flex-col space-y-1">
          {menuItems.map(({ label, icon: Icon, href }) => {
            const isActive = location.pathname === href;

            return (
              <Link
                key={label}
                to={href}
                className={`
                  flex items-center px-6 py-3 rounded-md mx-2 text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                    ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          className="
            flex items-center w-full text-gray-700 hover:text-red-500
            dark:text-gray-300 dark:hover:text-red-400 transition-colors
          "
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
