import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Clipboard,
  LayoutDashboard,
  LogOut,
  Upload,
  UserIcon,
  Zap, // Imported Zap for the "What's New" icon
} from "lucide-react";

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

// --- 1. Update Interface ---
interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  highlight?: boolean; // Flag for the special UI
  badge?: string; // Optional text badge
}

// --- 2. Update Data with "What's New" ---
const menuItems: MenuItem[] = [
  {
    name: "What's New",
    path: "/whats-new",
    icon: <Zap className="h-4 w-4" />, // Zap looks energetic
    highlight: true,
    badge: "",
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

// Helper for active state
const isActive = (path: string, currentPath: string) => {
  if (path === "/dashboard") {
    return currentPath === "/dashboard";
  }
  return currentPath.startsWith(path);
};

// --- 3. The Special Tech/Brutalist Link Component ---
// This handles the visual design (Cut corners, stripes, pulsing light)
const SpecialTechLink = React.forwardRef<
  HTMLAnchorElement,
  { item: MenuItem; active: boolean; onClick?: () => void }
>(({ item, active, onClick }, ref) => (
  <Link
    to={item.path}
    onClick={onClick}
    ref={ref}
    className="group relative block w-full outline-none mb-3 focus:scale-[0.98] transition-transform"
  >
    <div
      className={cn(
        "relative flex items-center justify-between overflow-hidden p-3 transition-all duration-300 shadow-sm",
        // Base Borders & Background
        "bg-card border-2 border-primary/20",
        // Hover State
        "group-hover:border-primary group-hover:bg-primary/5",
        // Active State
        active ? "border-primary bg-primary/10" : ""
      )}
      style={{
        // The Sci-Fi Cut Corner
        clipPath: "polygon(0 0, 100% 0, 100% 80%, 92% 100%, 0 100%)",
      }}
    >
      {/* Background Stripes Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.07] pointer-events-none transition-opacity"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)",
        }}
      />

      {/* Content Left */}
      <div className="flex items-center gap-3 relative z-10">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-none border border-primary/30 bg-background shadow-sm transition-colors",
            "group-hover:border-primary group-hover:text-primary",
            active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
          )}
        >
          {item.icon}
        </div>

        <div className="flex flex-col">
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              active ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"
            )}
          >
            {item.name}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
            {/* System Update */}
          </span>
        </div>
      </div>

      {/* Right Side: Pulsing Light & Badge */}
      <div className="relative z-10 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          {item.badge && (
            <span className="font-mono text-[10px] font-bold text-primary">{item.badge}</span>
          )}
        </div>
      </div>

      {/* Decorative Corner Bracket */}
      <div className="absolute bottom-0 right-0 w-3 h-3 border-l border-t border-primary/40 bg-background rotate-45 translate-y-1.5 translate-x-1.5" />
    </div>
  </Link>
));
SpecialTechLink.displayName = "SpecialTechLink";

// --- 4. Desktop Sidebar ---
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
    <aside className="w-64 flex-col border-r bg-card overflow-y-auto hidden md:flex font-sans">
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.path, location.pathname);

            // Render Special Link
            if (item.highlight) {
              return (
                <li key={item.name}>
                  <SpecialTechLink item={item} active={active} />
                </li>
              );
            }

            // Render Standard Link
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                    active
                      ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t">
        <button
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm font-medium transition-all",
            "bg-red-500 text-white hover:bg-red-600 active:scale-95"
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
 * --- 5. Mobile Toggle ---
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
              {menuItems.map((item) => {
                const active = isActive(item.path, location.pathname);

                // Render Special Link (Wrapped in SheetClose)
                if (item.highlight) {
                  return (
                    <li key={item.name}>
                      <SheetClose asChild>
                        <SpecialTechLink item={item} active={active} />
                      </SheetClose>
                    </li>
                  );
                }

                // Render Standard Link
                return (
                  <li key={item.name}>
                    <SheetClose asChild>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                          active
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </Link>
                    </SheetClose>
                  </li>
                );
              })}
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
