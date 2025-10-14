import { User, Menu, LogOut, ShoppingCart } from "lucide-react";
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
import { useCart } from "@/contexts/CartContext";

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
  const { cart } = useCart();
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
        {/* ----- Left: Logo + Menu Button ----- */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-xl"
          >
            <img src="/logo.png" className="w-10" alt="Logo" />
            <span>Vizuara</span>
          </Link>
        </div>

        {/* ----- Center: Always show Nav Links ----- */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="#products"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Products
          </Link>
          <Link
            to="#research"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Research
          </Link>
          <Link
            to="#teaching"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Teaching
          </Link>
        </nav>

        {/* ----- Right: Theme Toggle + Account Section ----- */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center">
              <Link to="/cart" className="relative mr-3">
                <ShoppingCart className="w-6 h-6" />

                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Link>
              {/* // 🔓 Logged-in dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                        {/* 👇 FIXED: use text-foreground so it's always visible */}
                        <User className="h-4 w-4 text-foreground" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium">
                        {user.firstName && user.lastName
                          ? `${user.firstName}`
                          : user.firstName || "Account"}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  {/* 👇 Always Dashboard for all roles */}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
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
            </div>
          ) : (
            // 🔒 Logged-out: Login + Signup buttons
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link to="/auth/login">Login</Link>
              </Button>
              <Button variant="default" asChild>
                <Link to="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
