import { useState } from "react";
import { Bell, Copy, Mail, Menu, ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

import { USER_ROLE } from "@/constants";
import { cn } from "@/lib/utils";

import { LifeBuoy } from "lucide-react";
import { CreateComplaint } from "./CreateComplaint";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { NotificationPanel } from "./notificationPanel";

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
  const { user } = useAuth();
  const { cart } = useCart();
  const { toast } = useToast();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const email = "hello@vizuara.com";

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied!",
      description: "The email address has been copied to your clipboard.",
    });
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
          className
        )}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* ----- Left: Logo + Navigation Menu ----- */}
          <div className="flex items-center gap-8">
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

            {/* Navigation Menu - hover to open */}
            <NavigationMenu className="hidden lg:flex" delayDuration={0}>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-foreground">
                    Products
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 bg-popover">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://dynaroute.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              DynaRoute
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              AI-powered routing and optimization solutions
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://vizz.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Vizz-AI Tutor
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Your personal AI learning assistant
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-foreground">
                    Research
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 bg-popover">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://research.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Research Domains
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              SciML, GenAI, Vision, Inference, and Reasoning
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://ai-highschool-research.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              AI Highschool Researcher Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Research training for aspiring high school AI
                              researchers
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://rlresearcherbootcamp.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Reinforcement Learning Research Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Master the fundamentals of Reinforcement Learning
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://flyvidesh.online/ml-bootcamp"
                          >
                            <div className="text-sm font-medium leading-none">
                              SciML Research Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Deep dive into Scientific Machine Learning
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://flyvidesh.online/ml-dl-bootcamp"
                          >
                            <div className="text-sm font-medium leading-none">
                              ML-DL Research Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Comprehensive ML and Deep Learning research
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://cvresearchbootcamp.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Computer Vision Research Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Build strong foundations, work on impactful
                              problems in CV
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://flyvidesh.online/gen-ai-professional-bootcamp"
                          >
                            <div className="text-sm font-medium leading-none">
                              GenAI Professional Bootcamp
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Advanced Generative AI for professionals
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-foreground">
                    Courses
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 bg-popover">
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://minor.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Minor in AI (LIVE)
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Comprehensive AI fundamentals program
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="http://genai-minor.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              Minor in GenAI (LIVE)
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Specialized generative AI curriculum
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://courses.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              For Undergrads, Grads & Professionals
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Self-paced courses by top instructors
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://interactive-ai-courses.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              For School Students (Grades 1-10)
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Interactive AI learning for all ages
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://www.youtube.com/@vizuara"
                          >
                            <div className="text-sm font-medium leading-none">
                              YouTube Channel
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Free AI/ML tutorials and content
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-accent/10 hover:text-foreground">
                    For businesses
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 bg-popover">
                      <li>
                        <div className="block select-none space-y-1 rounded-md p-3 leading-none">
                          <div className="text-sm font-medium leading-none">
                            Corporate AI Training
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Upskill your team with enterprise AI training
                            programs
                          </p>
                        </div>
                      </li>
                      <li>
                        <div className="block select-none space-y-1 rounded-md p-3 leading-none">
                          <div className="text-sm font-medium leading-none">
                            AI Product Development
                          </div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            Build custom AI solutions for your business
                          </p>
                        </div>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <a
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-muted/50"
                            href="https://dynaroute.vizuara.ai/"
                          >
                            <div className="text-sm font-medium leading-none">
                              DynaRoute API for Enterprises
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Enterprise-grade AI routing and optimization API
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      <li className="border-t border-border pt-3">
                        <div className="space-y-2 px-3">
                          <div className="text-sm font-medium leading-none flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Contact for Business
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                              {email}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={copyEmail}
                              className="shrink-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* ----- Right: Actions ----- */}
          <div className="flex items-center gap-4">
            {/* Contact Us Popover - Desktop only */}
            {location.pathname === "/" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="font-medium text-sm hidden lg:flex"
                  >
                    Contact us
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact Us
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Send us an email and we'll get back to you shortly.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {email}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyEmail}
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {user &&
              user.role !== USER_ROLE.ADMIN &&
              user.role !== USER_ROLE.ACCOUNTANT && (
                <CreateComplaint
                  userId={user.id}
                  trigger={
                    <Button
                      variant="ghost"
                      className="font-medium text-sm flex items-center gap-2"
                    >
                      <LifeBuoy className="h-4 w-4" />
                      <span className="hidden sm:block">Customer Support</span>
                    </Button>
                  }
                />
              )}

            <ThemeToggle />

            {user ? (
              <>
                {/* Bell Icon Button */}
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="flex items-center">
                  {user?.role !== USER_ROLE.ADMIN && (
                    <Link to="/cart" className="relative mr-3">
                      <ShoppingCart className="w-6 h-6" />
                      {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link
                    to={
                      user?.role === USER_ROLE.ADMIN
                        ? "/admin"
                        : user?.role === USER_ROLE.ACCOUNTANT
                        ? "/accountant"
                        : "/dashboard"
                    }
                    className="ml-2"
                  >
                    <Button
                      variant="default"
                      size="sm"
                      className="relative flex"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Button>
                  </Link>
                  {/* Logged-in dropdown (hover to open on desktop) */}
                  {/* <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative flex"
                      onMouseEnter={() => setAccountOpen(true)}
                      onMouseLeave={() => setAccountOpen(false)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
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

                  <DropdownMenuContent
                    align="end"
                    className="w-56"
                    onMouseEnter={() => setAccountOpen(true)}
                    onMouseLeave={() => setAccountOpen(false)}
                  >
                    <DropdownMenuItem asChild>
                      <Link to={user?.role === USER_ROLE.ADMIN ? "/admin" : "/dashboard"}>
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
                </DropdownMenu> */}
                  {/* </div> */}
                </div>
              </>
            ) : (
              // Logged-out: Login + Signup buttons
              <div className="hidden lg:flex items-center gap-2">
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

      {/* Notification Panel - moved outside header */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}
