import { useEffect, useMemo, useState } from "react";
import { Bell, BookOpen, Clock, HeartHandshake, Play, Search, ShoppingCart, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

import { USER_ROLE } from "@/constants";
import { cn } from "@/lib/utils";

import { CreateComplaint } from "./CreateComplaint";
import { NotificationPanel } from "./notificationPanel";
// import { StripBanner } from "./StripBanner";
// import { useStripBanner } from "@/contexts/StripBannerOverlayContext";

/* ══════════════════════════════════════════════════════
   Mini Panda Faces (for Dynamic Island scenes)
   ══════════════════════════════════════════════════════ */

type PandaMood = "happy" | "sleepy" | "excited" | "sad" | "cool";

function MiniPanda({ mood, className }: { mood: PandaMood; className?: string }) {
  /* Shared base: face, ears, eye patches, nose */
  const base = (
    <>
      <circle cx="50" cy="54" r="32" fill="white" />
      <circle cx="24" cy="26" r="12" fill="#222" />
      <circle cx="76" cy="26" r="12" fill="#222" />
      <ellipse cx="37" cy="48" rx="9" ry="8" fill="#222" />
      <ellipse cx="63" cy="48" rx="9" ry="8" fill="#222" />
      <ellipse cx="50" cy="58" rx="4" ry="2.5" fill="#222" />
    </>
  );

  const features: Record<PandaMood, React.ReactNode> = {
    happy: (
      <>
        {/* Squinted happy eyes */}
        <path d="M 32 46 Q 37 40 42 46" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 58 46 Q 63 40 68 46" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Big smile */}
        <path d="M 40 63 Q 50 74 60 63" stroke="#222" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* Blush */}
        <circle cx="30" cy="60" r="4" fill="#FFB6C1" opacity="0.5" />
        <circle cx="70" cy="60" r="4" fill="#FFB6C1" opacity="0.5" />
      </>
    ),
    sleepy: (
      <>
        {/* Closed eyes (lines) */}
        <line x1="32" y1="46" x2="42" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="58" y1="46" x2="68" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Small O mouth */}
        <circle cx="50" cy="65" r="3" fill="#222" />
        {/* Zzz */}
        <text x="72" y="34" fill="#9B7EDE" fontSize="12" fontWeight="bold" fontFamily="sans-serif">z</text>
        <text x="80" y="26" fill="#9B7EDE" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.7">z</text>
      </>
    ),
    excited: (
      <>
        {/* Big sparkly eyes */}
        <circle cx="37" cy="46" r="4.5" fill="white" />
        <circle cx="63" cy="46" r="4.5" fill="white" />
        <circle cx="38" cy="45" r="2" fill="#222" />
        <circle cx="64" cy="45" r="2" fill="#222" />
        {/* Sparkle dots in eyes */}
        <circle cx="36" cy="43" r="1" fill="white" />
        <circle cx="62" cy="43" r="1" fill="white" />
        {/* Open mouth smile */}
        <path d="M 40 63 Q 50 76 60 63" stroke="#222" strokeWidth="2" fill="#FF6B6B" strokeLinecap="round" />
        {/* Blush */}
        <circle cx="30" cy="60" r="4.5" fill="#FFB6C1" opacity="0.6" />
        <circle cx="70" cy="60" r="4.5" fill="#FFB6C1" opacity="0.6" />
      </>
    ),
    sad: (
      <>
        {/* Big sad eyes */}
        <circle cx="37" cy="46" r="4" fill="white" />
        <circle cx="63" cy="46" r="4" fill="white" />
        <circle cx="38" cy="47" r="2" fill="#222" />
        <circle cx="64" cy="47" r="2" fill="#222" />
        {/* Sad eyebrows */}
        <line x1="29" y1="38" x2="40" y2="40" stroke="#222" strokeWidth="2" strokeLinecap="round" />
        <line x1="71" y1="38" x2="60" y2="40" stroke="#222" strokeWidth="2" strokeLinecap="round" />
        {/* Tear */}
        <circle cx="32" cy="56" r="2" fill="#4D9DE0" opacity="0.6" />
        {/* Frown */}
        <path d="M 40 68 Q 50 60 60 68" stroke="#222" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>
    ),
    cool: (
      <>
        {/* Sunglasses */}
        <rect x="28" y="41" width="16" height="10" rx="3" fill="#333" />
        <rect x="56" y="41" width="16" height="10" rx="3" fill="#333" />
        <line x1="44" y1="46" x2="56" y2="46" stroke="#333" strokeWidth="2" />
        {/* Glare on glasses */}
        <line x1="30" y1="43" x2="34" y2="43" stroke="white" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
        <line x1="58" y1="43" x2="62" y2="43" stroke="white" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
        {/* Smirk */}
        <path d="M 42 64 Q 50 70 58 62" stroke="#222" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0", className)} fill="none">
      {base}
      {features[mood]}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   Dynamic Island
   ══════════════════════════════════════════════════════ */

interface RecentCourse {
  name: string;
  path: string;
}

type IslandScene =
  | { type: "datetime" }
  | { type: "browse" }
  | { type: "panda"; mood: PandaMood; text: string }
  | { type: "recent"; name: string; path: string };

function DynamicIsland() {
  const navigate = useNavigate();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(new Date());

  /* Live clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Check for recently watched course */
  const recentCourse = useMemo<RecentCourse | null>(() => {
    try {
      const raw = localStorage.getItem("redpanda_recent_course");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /* Build scene rotation */
  const scenes = useMemo<IslandScene[]>(() => {
    const base: IslandScene[] = [
      { type: "panda", mood: "happy", text: "Having a great day!" },
      { type: "datetime" },
      { type: "browse" },
      { type: "panda", mood: "excited", text: "Ready to learn!" },
      { type: "datetime" },
      { type: "panda", mood: "cool", text: "You're doing great!" },
      { type: "panda", mood: "sleepy", text: "Remember to rest!" },
      { type: "datetime" },
      { type: "panda", mood: "sad", text: "Come back soon..." },
    ];
    if (recentCourse) {
      base.splice(2, 0, {
        type: "recent",
        name: recentCourse.name,
        path: recentCourse.path,
      });
    }
    return base;
  }, [recentCourse]);

  /* Auto-cycle scenes */
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSceneIndex((i) => (i + 1) % scenes.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, scenes.length]);

  /* Format date/time */
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const scene = scenes[sceneIndex];

  const renderScene = () => {
    switch (scene.type) {
      case "datetime":
        return (
          <div className="flex items-center gap-2 text-white/90">
            <Clock className="h-3.5 w-3.5 text-white/60" />
            <span className="text-xs font-medium">
              {dateStr}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-xs font-semibold tabular-nums">
              {timeStr}
            </span>
          </div>
        );

      case "browse":
        return (
          <button
            onClick={() => navigate("/courses")}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            aria-label="Discover new courses"
          >
            <BookOpen className="h-3.5 w-3.5 text-accent-sky" />
            <span className="text-xs font-medium">Discover new courses</span>
            <span className="text-[10px] bg-white/15 rounded-full px-1.5 py-0.5 font-semibold">
              Browse
            </span>
          </button>
        );

      case "panda":
        return (
          <div className="flex items-center gap-2">
            <MiniPanda
              mood={scene.mood}
              className={cn(
                "h-7 w-7",
                scene.mood === "happy" && "island-panda-bounce",
                scene.mood === "sleepy" && "island-panda-rock",
                scene.mood === "excited" && "island-panda-bounce",
                scene.mood === "sad" && "island-panda-rock",
                scene.mood === "cool" && "island-panda-bounce"
              )}
            />
            <span className="text-xs font-medium text-white/80">
              {scene.text}
            </span>
          </div>
        );

      case "recent":
        return (
          <button
            onClick={() => navigate(scene.path)}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            aria-label={`Continue watching ${scene.name}`}
          >
            <Play className="h-3 w-3 text-accent-mint fill-accent-mint" />
            <span className="text-xs font-medium truncate max-w-[140px]">
              {scene.name}
            </span>
            <span className="text-[10px] bg-accent-mint/20 text-accent-mint rounded-full px-1.5 py-0.5 font-semibold shrink-0">
              Continue
            </span>
          </button>
        );
    }
  };

  return (
    <div
      className="dynamic-island relative flex items-center justify-center rounded-full bg-neutral-950 dark:bg-neutral-900 h-9 min-w-[280px] px-6 cursor-default overflow-hidden transition-all duration-500"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

      {/* Scene content with crossfade */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center transition-all duration-300",
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1"
        )}
      >
        {renderScene()}
      </div>

      {/* Pulse indicator dots at bottom */}
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
        {scenes.map((_, i) => (
          <span
            key={i}
            className={cn(
              "block h-[2px] rounded-full transition-all duration-300",
              i === sceneIndex
                ? "w-2 bg-white/50"
                : "w-[2px] bg-white/15"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Header
   ══════════════════════════════════════════════════════ */

type HeaderProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
};

export function Header({ className }: HeaderProps) {
  // const { banners } = useStripBanner();
  const { user } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

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
          "sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
          className
        )}
      >
        <div className="container flex h-14 items-center justify-between gap-3 px-4">
          {/* ── Left: Logo ──────────────────────────── */}
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-lg shrink-0"
          >
            <img src="/logo.png" className="w-8" alt="Logo" />
            <span className="hidden sm:block">RedPanda Learns</span>
          </Link>

          {/* ── Centre: Dynamic Island ──────────────── */}
          <div className="flex-1 flex justify-center min-w-0">
            <DynamicIsland />
          </div>

          {/* ── Right: Actions ─────────────────────── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Customer Support - Desktop, logged-in non-admin */}
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
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Customer support"
                      >
                        <HeartHandshake className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              )}

            <ThemeToggle />

            {/* Search */}
            <Link
              to="/search"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Search courses"
            >
              <Search className="h-4 w-4" />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            </Link>

            {user ? (
              <>
                {/* Notifications */}
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-foreground" />
                  {unreadCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5",
                        "bg-red-500 text-white text-[9px] font-bold",
                        "min-w-[16px] h-4 px-0.5",
                        "flex items-center justify-center",
                        "rounded-full border-2 border-background"
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Cart */}
                {user?.role !== USER_ROLE.ADMIN && (
                  <Link
                    to="/cart"
                    className="relative p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Shopping cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {cart.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 flex items-center justify-center border-2 border-background">
                        {cart.length}
                      </span>
                    )}
                  </Link>
                )}

                {/* Dashboard - Desktop */}
                <Link to={dashboardPath} className="hidden lg:block">
                  <Button variant="default" size="sm" className="h-8 text-xs">
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                  <Link to="/auth/login">Login</Link>
                </Button>
                <Button variant="default" size="sm" asChild className="h-8 text-xs">
                  <Link to="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Strip Banner (conditional) */}
        {/* StripBanner disabled
        {(["/", "/dashboard", "/courses"].includes(location.pathname) ||
          /^\/courses\/[^/]+\/lesson(\/[^/]+)?$/.test(location.pathname) ||
          /^\/course\/[^/]+\/lesson(\/[^/]+)?$/.test(location.pathname)) &&
          banners.length > 0 && (
            <StripBanner
              banners={banners}
              autoRotate={true}
              rotationInterval={5000}
              className="z-0"
            />
          )}
        */}
      </header>

      {/* Notification side panel */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onUnreadChange={setUnreadCount}
      />

      {/* Dynamic Island panda animations */}
      <style>{`
        @keyframes islandPandaBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-2px) scale(1.05); }
          60% { transform: translateY(1px) scale(0.98); }
        }
        @keyframes islandPandaRock {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .island-panda-bounce {
          animation: islandPandaBounce 2s ease-in-out infinite;
        }
        .island-panda-rock {
          animation: islandPandaRock 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
