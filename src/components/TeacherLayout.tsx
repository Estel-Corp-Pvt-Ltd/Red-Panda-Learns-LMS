import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Users,
  X,
} from "lucide-react";
import React, { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface TeacherLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", path: "/teacher", icon: LayoutDashboard, exact: true },
  { name: "My Courses", path: "/teacher/my-courses", icon: GraduationCap },
  { name: "Students", path: "/teacher/students", icon: Users },
  { name: "Course Progress", path: "/teacher/courses", icon: BookOpen },
  { name: "Content Management", path: "/teacher/content-management", icon: Lock },
  { name: "Statistics", path: "/teacher/statistics", icon: BarChart3 },
  { name: "Announcements", path: "/teacher/announcements", icon: Megaphone },
  { name: "Comments", path: "/teacher/comments", icon: MessageSquareText },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.name}</span>
      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary/60" />}
    </Link>
  );
}

function SidebarContent({
  onLinkClick,
}: {
  onLinkClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (item: (typeof navItems)[number]) =>
    item.exact
      ? location.pathname === item.path
      : location.pathname.startsWith(item.path);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      localStorage.clear();
    } catch {
      console.error("Logout failed");
    }
  };

  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      {/* Brand */}
      <div className="mb-4 px-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
          Teacher Portal
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={isActive(item)}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-border/30 pt-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/30 bg-gradient-to-b from-card/70 to-card/40 backdrop-blur-md">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-muted/20 dark:bg-muted/10">
          {/* Mobile header bar */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/30 bg-background/80 backdrop-blur-md px-4 py-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-semibold">Teacher Portal</span>
          </div>

          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-r-0">
          <div className="flex h-full flex-col bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-xl">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <span className="font-semibold text-sm">Teacher Portal</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SidebarContent onLinkClick={() => setMobileOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TeacherLayout;
