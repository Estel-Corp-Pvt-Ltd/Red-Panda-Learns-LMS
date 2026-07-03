import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Compass, UserCircle, LogOut, Zap, ClipboardList,
  Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  path: "/dashboard",    icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { label: "Learn",      path: "/courses",      icon: <BookOpen className="h-[18px] w-[18px]" /> },
  { label: "Explore",    path: "/free-courses", icon: <Compass className="h-[18px] w-[18px]" /> },
  { label: "Quizzes",    path: "/quizzes",      icon: <ClipboardList className="h-[18px] w-[18px]" /> },
  { label: "What's New", path: "/whats-new",    icon: <Zap className="h-[18px] w-[18px]" /> },
];

function checkActive(path: string, currentPath: string) {
  if (path === "/dashboard") return currentPath === "/dashboard";
  return currentPath.startsWith(path);
}

/** Circular rail button with a hover tooltip on the right. */
function RailButton({ icon, label, active, onClick, to }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; to?: string;
}) {
  const cls = cn(
    "group relative grid h-11 w-11 place-items-center rounded-full transition-all duration-150",
    active
      ? "bg-foreground text-background shadow-md"
      : "text-muted-foreground hover:bg-primary/20 hover:text-foreground"
  );
  const tooltip = (
    <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-lg group-hover:block">
      {label}
    </span>
  );
  return to ? (
    <Link to={to} className={cls} aria-label={label}>{icon}{tooltip}</Link>
  ) : (
    <button onClick={onClick} className={cls} aria-label={label}>{icon}{tooltip}</button>
  );
}

export interface StudentSidebarProps {
  streak?: number;
  activeDaysThisWeek?: boolean[];
}

export function StudentSidebar(_props: StudentSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  const handleLogout = async () => {
    try { await logout(); localStorage.clear(); navigate("/"); } catch {}
  };

  const firstName = user?.firstName ?? "Learner";
  const initials = `${firstName.charAt(0)}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <>
      <aside className="hidden md:flex shrink-0 py-3 pl-3">
        <div className="flex h-full flex-col items-center gap-2 rounded-[28px] border border-sidebar-border bg-sidebar-background px-2 py-3 shadow-lg">

          {/* Brand / home */}
          <Link
            to="/dashboard"
            aria-label="RedPanda Learns — Home"
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-black shadow-md"
          >
            R
          </Link>

          <div className="my-1 h-px w-6 bg-sidebar-border" />

          {/* Main nav */}
          <nav className="flex flex-col items-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <RailButton
                key={item.path}
                to={item.path}
                icon={item.icon}
                label={item.label}
                active={checkActive(item.path, location.pathname)}
              />
            ))}
          </nav>

          <div className="flex-1" />

          {/* Profile + logout */}
          <RailButton
            to="/profile"
            label="Profile"
            active={checkActive("/profile", location.pathname)}
            icon={<UserCircle className="h-[18px] w-[18px]" />}
          />
          <RailButton
            label="Logout"
            onClick={() => setShowLogoutDialog(true)}
            icon={<LogOut className="h-[18px] w-[18px]" />}
          />

          {/* User avatar */}
          <Link to="/profile" aria-label="Profile" className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/50 text-[11px] font-bold text-primary-foreground shadow">
            {user?.photoURL
              ? <img src={user.photoURL} alt={firstName} className="h-full w-full object-cover" />
              : initials}
          </Link>

          <div className="my-1 h-px w-6 bg-sidebar-border" />

          {/* Theme toggle (sun = light, moon = dark) */}
          <div className="flex flex-col items-center gap-1 rounded-full bg-muted/60 p-1">
            <button
              onClick={() => applyTheme(false)}
              aria-label="Light mode"
              className={cn("grid h-8 w-8 place-items-center rounded-full transition-all",
                !isDark ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground")}
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyTheme(true)}
              aria-label="Dark mode"
              className={cn("grid h-8 w-8 place-items-center rounded-full transition-all",
                isDark ? "bg-background text-primary shadow" : "text-muted-foreground hover:text-foreground")}
            >
              <Moon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle className="sr-only">Confirm Logout</DialogTitle>
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <LogOut className="h-7 w-7 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Sign out?</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">You will need to sign back in to continue learning.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setShowLogoutDialog(false)} className="px-5 py-2 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors">
              Stay
            </button>
            <button onClick={handleLogout} className="px-5 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors">
              Sign Out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
