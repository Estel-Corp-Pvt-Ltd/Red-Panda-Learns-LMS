import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Compass, Users, Calendar, MessageSquare, Award,
  UserCircle, Settings, ChevronLeft, ChevronRight, LogOut, Zap, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    path: "/dashboard",    icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { label: "Learn",        path: "/courses",       icon: <BookOpen className="h-[18px] w-[18px]" /> },
  { label: "Explore",      path: "/free-courses",  icon: <Compass className="h-[18px] w-[18px]" /> },
  { label: "Quizzes",      path: "/quizzes",       icon: <ClipboardList className="h-[18px] w-[18px]" /> },
  { label: "What's New",   path: "/whats-new",     icon: <Zap className="h-[18px] w-[18px]" /> },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Profile",  path: "/profile",  icon: <UserCircle className="h-[18px] w-[18px]" /> },
];

function checkActive(path: string, currentPath: string) {
  if (path === "/dashboard") return currentPath === "/dashboard";
  return currentPath.startsWith(path);
}

export interface StudentSidebarProps {
  streak?: number;
  activeDaysThisWeek?: boolean[];
}

export function StudentSidebar({ streak = 0, activeDaysThisWeek }: StudentSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = async () => {
    try { await logout(); localStorage.clear(); navigate("/"); } catch {}
  };

  const firstName = user?.firstName ?? "Learner";
  const initials = `${firstName.charAt(0)}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <>
      <aside className={cn(
        "hidden md:flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
        "bg-white dark:bg-[hsl(217,35%,8%)]",
        "border-r border-border",
        collapsed ? "w-[64px]" : "w-[232px]"
      )}>

        {/* Logo / collapse */}
        <div className={cn("flex items-center px-3 pt-3 pb-2", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <span className="text-sm font-black tracking-tight text-primary pl-1 select-none">
              RedPanda<span className="text-foreground">Learns</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-0.5 mt-1">
          {NAV_ITEMS.map((item) => {
            const active = checkActive(item.path, location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 group relative",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />}
                <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate leading-none flex-1">{item.label}</span>}
                {!collapsed && item.badge != null && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2.5 z-50 pointer-events-none hidden group-hover:flex items-center">
                    <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg border border-border whitespace-nowrap">
                      {item.label}
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full px-1 py-0.5">{item.badge}</span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Streak widget hidden until streaks are officially released. */}

        {/* Bottom items */}
        <div className="px-2 pb-1 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => {
            const active = checkActive(item.path, location.pathname);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 group relative",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />}
                <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate leading-none">{item.label}</span>}
                {collapsed && (
                  <div className="absolute left-full ml-2.5 z-50 pointer-events-none hidden group-hover:flex items-center">
                    <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg border border-border whitespace-nowrap">{item.label}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* User strip */}
        <div className="px-2 pb-3 pt-2 border-t border-border mt-1">
          <div className={cn("flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-muted transition-colors", collapsed ? "justify-center" : "")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[#82b6ff] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.photoURL
                ? <img src={user.photoURL} alt={firstName} className="w-full h-full rounded-full object-cover" />
                : initials
              }
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{firstName} {user?.lastName ?? ""}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email ?? ""}</p>
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); setShowLogoutDialog(true); }}
              className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
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
