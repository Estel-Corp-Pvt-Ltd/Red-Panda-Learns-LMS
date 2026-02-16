import { useState } from "react";
import { Bell, Copy, HeartHandshake, Mail, ShoppingCart, User, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

import { USER_ROLE } from "@/constants";
import { cn } from "@/lib/utils";

import { CreateComplaint } from "./CreateComplaint";
import { NotificationPanel } from "./notificationPanel";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { StripBanner } from "./StripBanner";
import { useStripBanner } from "@/contexts/StripBannerOverlayContext";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type HeaderProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
};

export function Header({ className }: HeaderProps) {
  const { banners } = useStripBanner();
  const { user } = useAuth();
  const { cart } = useCart();
  const { toast } = useToast();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const email = "hello@vizuara.com";

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied!",
      description: "The email address has been copied to your clipboard.",
    });
  };

  const dashboardPath =
    user?.role === USER_ROLE.ADMIN
      ? "/admin"
      : user?.role === USER_ROLE.ACCOUNTANT
        ? "/accountant"
        : user?.role === USER_ROLE.INSTRUCTOR
          ? "/instructor"
          : user?.role === USER_ROLE.TEACHER
            ? "/teacher"
            : "/dashboard";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
          className
        )}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* ----- Left: Logo + Desktop Navigation Menu ----- */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
              <img src="/logo.png" className="w-10" alt="Logo" />
              <span>Vizuara</span>
            </Link>

            {/* Desktop Navigation Menu - hover to open */}
            <NavigationMenu className="hidden lg:flex" delayDuration={0}>
              <NavigationMenuList>
                {/* Products */}
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
                            <div className="text-sm font-medium leading-none">DynaRoute</div>
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
                            <div className="text-sm font-medium leading-none">Vizz-AI Tutor</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Your personal AI learning assistant
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Research */}
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
                            <div className="text-sm font-medium leading-none">Research Domains</div>
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
                              Research training for aspiring high school AI researchers
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
                              Build strong foundations, work on impactful problems in CV
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

                {/* Courses */}
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
                            <div className="text-sm font-medium leading-none">YouTube Channel</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Free AI/ML tutorials and content
                            </p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* For businesses – simple external link (desktop) */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a
                      href="https://firstprinciplelabs.ai/"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-transparent hover:bg-accent/10 hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                    >
                      For businesses
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* ----- Right: Actions (Desktop + Mobile) ----- */}
          <div className="flex items-center gap-3">
            {/* Contact Us Popover - Desktop only */}
            {location.pathname === "/" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="font-medium text-sm hidden lg:flex">
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
                      <Button size="sm" variant="outline" onClick={copyEmail} className="shrink-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Customer Support - Desktop only */}
            {user &&
              user.role !== USER_ROLE.ADMIN &&
              user.role !== USER_ROLE.ACCOUNTANT &&
              user.role !== USER_ROLE.TEACHER && (
                <div className="hidden lg:block">
                  <CreateComplaint
                    userId={user.id}
                    trigger={
                      <Button
                        variant="ghost"
                        className="font-medium text-sm flex items-center gap-2"
                      >
                        <HeartHandshake className="h-4 w-4" />
                        <span className="hidden sm:block">Customer Support</span>
                      </Button>
                    }
                  />
                </div>
              )}

            {/* Theme toggle */}
            <ThemeToggle />

            {user ? (
              <>
                {/* Notifications */}
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-foreground" />
                  {unreadCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1 -right-1",
                        "bg-red-500 text-white text-[10px] font-bold",
                        "min-w-[18px] h-[18px] px-1",
                        "flex items-center justify-center",
                        "rounded-full shadow-lg",
                        "border-2 border-background",
                        "animate-pulse"
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Cart (except admin) */}
                {user?.role !== USER_ROLE.ADMIN && (
                  <Link to="/cart" className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    {cart.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                  </Link>
                )}

                {/* Dashboard button - Desktop only */}
                <Link to={dashboardPath} className="hidden lg:block">
                  <Button variant="default" size="sm" className="relative flex">
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
              </>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/auth/login">Login</Link>
                </Button>
                <Button variant="default" asChild>
                  <Link to="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="flex flex-col">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-lg font-semibold">
                    <SheetClose asChild>
                      <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" className="w-8" alt="Logo" />
                        <span>Vizuara</span>
                      </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-6">
                  {/* Top: primary actions */}
                  <div className="space-y-2 pb-4 border-b border-border">
                    {user ? (
                      <>
                        <SheetClose asChild>
                          <Link to={dashboardPath}>
                            <Button className="w-full justify-start gap-2">
                              <User className="h-4 w-4" />
                              <span>Dashboard</span>
                            </Button>
                          </Link>
                        </SheetClose>

                        {user.role !== USER_ROLE.ADMIN && user.role !== USER_ROLE.ACCOUNTANT && (
                          <CreateComplaint
                            userId={user.id}
                            trigger={
                              <Button variant="outline" className="w-full justify-start gap-2">
                                <HeartHandshake className="h-4 w-4" />
                                <span>Customer Support</span>
                              </Button>
                            }
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Button variant="outline" asChild className="w-full justify-center">
                            <Link to="/auth/login">Login</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button variant="default" asChild className="w-full justify-center">
                            <Link to="/auth/signup">Sign Up</Link>
                          </Button>
                        </SheetClose>
                      </>
                    )}
                  </div>

                  {/* Mobile nav */}
                  <nav className="space-y-2 pt-2">
                    <Accordion type="multiple" className="w-full">
                      {/* Products */}
                      <AccordionItem value="products">
                        <AccordionTrigger className="text-base font-medium">
                          Products
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-3 pt-2">
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://dynaroute.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">DynaRoute</div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    AI-powered routing and optimization solutions
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://vizz.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Vizz-AI Tutor
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Your personal AI learning assistant
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Research */}
                      <AccordionItem value="research">
                        <AccordionTrigger className="text-base font-medium">
                          Research
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-3 pt-2">
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://research.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Research Domains
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    SciML, GenAI, Vision, Inference, and Reasoning
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://ai-highschool-research.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    AI Highschool Researcher Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Research training for aspiring high school AI researchers
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://rlresearcherbootcamp.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Reinforcement Learning Research Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Master the fundamentals of Reinforcement Learning
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://flyvidesh.online/ml-bootcamp"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    SciML Research Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Deep dive into Scientific Machine Learning
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://flyvidesh.online/ml-dl-bootcamp"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    ML-DL Research Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Comprehensive ML and Deep Learning research
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://cvresearchbootcamp.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Computer Vision Research Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Build strong foundations, work on impactful problems in CV
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://flyvidesh.online/gen-ai-professional-bootcamp"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    GenAI Professional Bootcamp
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Advanced Generative AI for professionals
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Courses */}
                      <AccordionItem value="courses">
                        <AccordionTrigger className="text-base font-medium">
                          Courses
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-3 pt-2">
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://minor.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Minor in AI (LIVE)
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Comprehensive AI fundamentals program
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="http://genai-minor.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    Minor in GenAI (LIVE)
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Specialized generative AI curriculum
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://courses.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    For Undergrads, Grads & Professionals
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Self-paced courses by top instructors
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://interactive-ai-courses.vizuara.ai/"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    For School Students (Grades 1-10)
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Interactive AI learning for all ages
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                            <li>
                              <SheetClose asChild>
                                <a
                                  href="https://www.youtube.com/@vizuara"
                                  className="block rounded-md px-2 py-2 hover:bg-muted/60"
                                >
                                  <div className="text-sm font-medium leading-none">
                                    YouTube Channel
                                  </div>
                                  <p className="text-xs leading-snug text-muted-foreground mt-1">
                                    Free AI/ML tutorials and content
                                  </p>
                                </a>
                              </SheetClose>
                            </li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* For businesses – simple external link (mobile) */}
                    <SheetClose asChild>
                      <a
                        href="https://firstprinciplelabs.ai/"
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md px-2 py-2 text-base font-medium hover:bg-muted/60"
                      >
                        For businesses
                      </a>
                    </SheetClose>
                  </nav>

                  <div className="pt-2 space-y-4">
                    {/* Contact us (mobile) */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact us
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
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {(["/", "/dashboard", "/courses"].includes(location.pathname) ||
          /^\/courses\/[^\/]+\/lesson(\/[^\/]+)?$/.test(location.pathname) ||
          /^\/course\/[^\/]+\/lesson(\/[^\/]+)?$/.test(location.pathname)) &&
          banners.length > 0 && (
            <StripBanner
              banners={banners}
              autoRotate={true}
              rotationInterval={5000}
              className="z-0 "
            />
          )}
      </header>

      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}
