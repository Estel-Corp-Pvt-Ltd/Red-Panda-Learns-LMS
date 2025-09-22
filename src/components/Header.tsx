import { Search, User, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type HeaderProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
};

export function Header({
  onMenuClick,
  showMenuButton = false,
  className,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        {/* ----- Left: Logo ----- */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button variant="ghost" size="sm" onClick={onMenuClick} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <img src="/logo.png" className="w-10" alt="Logo" />
            <span>Vizuara</span>
          </Link>
        </div>

        {/* ----- Center: Navigation Links ----- */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#products" className="text-muted-foreground hover:text-foreground transition-colors">
            Products
          </a>
          <a href="#research" className="text-muted-foreground hover:text-foreground transition-colors">
            Research
          </a>
          <a href="#teaching" className="text-muted-foreground hover:text-foreground transition-colors">
            Teaching
          </a>
        </nav>

        {/* ----- Right: Theme + Account ----- */}
        <div className="flex items-center gap-4">
          {/* Theme toggle always visible */}
          <ThemeToggle />

          {/* ACCOUNT SECTION */}
          {user ? (
            // ----- Logged-in User: Name + Dropdown -----
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.firstName && user.lastName
                        ? `${user.firstName} `
                        : user.firstName || "Account"}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/admin">
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // ----- Not Logged-In: Account redirects -----
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/auth/login")}
            >
              Account
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}