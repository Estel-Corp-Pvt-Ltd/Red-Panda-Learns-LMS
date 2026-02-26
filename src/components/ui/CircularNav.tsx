import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, ArrowLeft, LogOut } from "lucide-react";

/* ─── Types ───────────────────────────────────────── */

export interface CircularNavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: CircularNavItem[];
}

interface CircularNavProps {
  items: CircularNavItem[];
  onNavigate: (path: string) => void;
  isActive: (path: string) => boolean;
  onLogout?: () => void;
  centerLabel?: string;
}

/* ─── Happy Panda SVG (FAB icon) ──────────────────── */

function HappyPanda({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Face */}
      <circle cx="50" cy="54" r="36" fill="white" />
      {/* Ears */}
      <circle cx="22" cy="22" r="14" fill="#1a1a1a" />
      <circle cx="78" cy="22" r="14" fill="#1a1a1a" />
      {/* Inner ears */}
      <circle cx="22" cy="22" r="7" fill="#FFB6C1" opacity="0.4" />
      <circle cx="78" cy="22" r="7" fill="#FFB6C1" opacity="0.4" />
      {/* Eye patches */}
      <ellipse cx="36" cy="46" rx="11" ry="9" fill="#1a1a1a" />
      <ellipse cx="64" cy="46" rx="11" ry="9" fill="#1a1a1a" />
      {/* Happy eyes (squinted arcs = smiling) */}
      <path
        d="M 30 44 Q 36 38 42 44"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 58 44 Q 64 38 70 44"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Nose */}
      <ellipse cx="50" cy="57" rx="5" ry="3.5" fill="#1a1a1a" />
      {/* Big smile */}
      <path
        d="M 38 63 Q 50 76 62 63"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Blush */}
      <circle cx="27" cy="58" r="5.5" fill="#FFB6C1" opacity="0.55" />
      <circle cx="73" cy="58" r="5.5" fill="#FFB6C1" opacity="0.55" />
    </svg>
  );
}

/* ─── Crying Panda SVG (logout confirmation) ──────── */

function CryingPanda({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* Face */}
      <circle cx="50" cy="54" r="36" fill="white" />
      {/* Ears */}
      <circle cx="22" cy="22" r="14" fill="#1a1a1a" />
      <circle cx="78" cy="22" r="14" fill="#1a1a1a" />
      {/* Inner ears */}
      <circle cx="22" cy="22" r="7" fill="#FFB6C1" opacity="0.4" />
      <circle cx="78" cy="22" r="7" fill="#FFB6C1" opacity="0.4" />
      {/* Eye patches */}
      <ellipse cx="36" cy="46" rx="11" ry="9" fill="#1a1a1a" />
      <ellipse cx="64" cy="46" rx="11" ry="9" fill="#1a1a1a" />
      {/* Open sad eyes */}
      <circle cx="36" cy="44" r="4.5" fill="white" />
      <circle cx="64" cy="44" r="4.5" fill="white" />
      <circle cx="37" cy="43" r="2.2" fill="#1a1a1a" />
      <circle cx="65" cy="43" r="2.2" fill="#1a1a1a" />
      {/* Sad eyebrows */}
      <line
        x1="27"
        y1="34"
        x2="40"
        y2="37"
        stroke="#1a1a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="73"
        y1="34"
        x2="60"
        y2="37"
        stroke="#1a1a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Tears (animated) */}
      <g>
        <circle cx="30" cy="55" r="2" fill="#4D9DE0" opacity="0.7">
          <animate
            attributeName="cy"
            values="52;70;52"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.8;0.2;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="70" cy="55" r="2" fill="#4D9DE0" opacity="0.7">
          <animate
            attributeName="cy"
            values="52;70;52"
            dur="2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
          <animate
            attributeName="opacity"
            values="0.8;0.2;0.8"
            dur="2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
        </circle>
      </g>
      {/* Nose */}
      <ellipse cx="50" cy="57" rx="5" ry="3.5" fill="#1a1a1a" />
      {/* Frown */}
      <path
        d="M 38 70 Q 50 60 62 70"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Blush */}
      <circle cx="27" cy="60" r="5" fill="#FFB6C1" opacity="0.4" />
      <circle cx="73" cy="60" r="5" fill="#FFB6C1" opacity="0.4" />
    </svg>
  );
}

/* ─── Component ───────────────────────────────────── */

export function CircularNav({
  items,
  onNavigate,
  isActive,
  onLogout,
  centerLabel,
}: CircularNavProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);
  const [drilldown, setDrilldown] = useState<CircularNavItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /* Visible items = drilldown children OR top-level, plus optional logout */
  const ringItems = useMemo(
    () => drilldown?.children ?? items,
    [drilldown, items]
  );

  const allItems: CircularNavItem[] = useMemo(() => {
    const base = [...ringItems];
    if (onLogout) {
      base.push({
        name: "Logout",
        path: "__logout__",
        icon: <LogOut className="h-5 w-5" />,
      });
    }
    return base;
  }, [ringItems, onLogout]);

  /* Radius scales with item count and viewport */
  const radius = useMemo(() => {
    const count = allItems.length;
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const base = Math.min(vmin * 0.28, 210);
    if (count <= 3) return base * 0.6;
    if (count <= 5) return base * 0.78;
    if (count <= 8) return base * 0.95;
    return base * 1.1;
  }, [allItems.length]);

  /* Screen centre (recalculated on open) */
  const center = useMemo(
    () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open]
  );

  /* ── Mouse tracking ──────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) =>
      setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [open]);

  /* ── Keyboard (Escape + number shortcuts) ────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      // Escape: close confirm > go back > close nav
      if (e.key === "Escape") {
        if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else if (drilldown) {
          handleBack();
        } else {
          handleClose();
        }
        return;
      }

      // Don't handle shortcuts when confirm is showing
      if (showLogoutConfirm) return;

      // Number shortcuts: 1-9 for items
      const num = parseInt(e.key);
      if (num >= 1 && num <= allItems.length && num <= 9) {
        handleItemClick(allItems[num - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, drilldown, showLogoutConfirm, allItems]);

  /* ── Entrance-done timer ─────────────────────────── */
  useEffect(() => {
    if (expanded) {
      const t = setTimeout(
        () => setEntranceDone(true),
        420 + allItems.length * 40
      );
      return () => clearTimeout(t);
    }
    setEntranceDone(false);
  }, [expanded, allItems.length]);

  /* ── Open / close / drill helpers ────────────────── */
  const handleOpen = () => {
    setOpen(true);
    setMousePos({ x: -1, y: -1 });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setExpanded(true));
    });
  };

  const handleClose = useCallback(() => {
    setExpanded(false);
    setEntranceDone(false);
    setShowLogoutConfirm(false);
    setTimeout(() => {
      setOpen(false);
      setDrilldown(null);
    }, 280);
  }, []);

  const handleDrilldown = (item: CircularNavItem) => {
    setExpanded(false);
    setEntranceDone(false);
    setTimeout(() => {
      setDrilldown(item);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
    }, 250);
  };

  const handleBack = () => {
    setExpanded(false);
    setEntranceDone(false);
    setTimeout(() => {
      setDrilldown(null);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setExpanded(true));
      });
    }, 250);
  };

  const handleItemClick = (item: CircularNavItem) => {
    if (item.path === "__logout__") {
      setShowLogoutConfirm(true);
      return;
    }
    if (item.children && item.children.length > 0) {
      handleDrilldown(item);
    } else {
      onNavigate(item.path);
      handleClose();
    }
  };

  const confirmLogout = () => {
    onLogout?.();
    handleClose();
  };

  /* ── Per-item style (position + magnetic scale) ──── */
  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => {
      const count = allItems.length;
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (!expanded) {
        return {
          transform: `translate(${x}px, ${y}px) scale(0)`,
          opacity: 0,
        };
      }

      let scale = 1;
      if (mousePos.x >= 0) {
        const itemX = center.x + x;
        const itemY = center.y + y;
        const dist = Math.sqrt(
          (mousePos.x - itemX) ** 2 + (mousePos.y - itemY) ** 2
        );
        scale = 1 + 0.35 * Math.max(0, 1 - dist / 90);
      }

      return {
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        opacity: 1,
      };
    },
    [allItems.length, radius, center, mousePos, expanded]
  );

  /* ── Transition string ───────────────────────────── */
  const getTransition = (index: number) => {
    if (!expanded) {
      return "transform 0.22s ease-in, opacity 0.18s ease-in";
    }
    if (!entranceDone) {
      return `transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${index * 40}ms, opacity 0.3s ease ${index * 40}ms`;
    }
    return "transform 0.12s ease-out";
  };

  /* ═══════════════════ Render ═══════════════════════ */
  return (
    <>
      {/* ── Panda FAB ─────────────────────────────── */}
      <button
        onClick={() => (open ? handleClose() : handleOpen())}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full",
          "transition-all duration-300 active:scale-90",
          open
            ? "bg-red-500 text-white shadow-[0_4px_24px_rgba(239,68,68,0.45)] hover:scale-105"
            : "shadow-[0_4px_28px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.28)]",
          !open && "bg-white border-2 border-foreground/10"
        )}
        style={open ? { transform: "rotate(135deg)" } : undefined}
        aria-label={open ? "Close navigation" : "Open navigation"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <HappyPanda className="h-11 w-11 panda-wobble" />
        )}
      </button>

      {/* ── Overlay (portalled to body) ───────────── */}
      {open &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-40 transition-all duration-300",
              expanded
                ? "bg-black/50 backdrop-blur-md"
                : "bg-transparent backdrop-blur-0"
            )}
            onClick={handleClose}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative outer ring */}
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  "border border-white/[0.08] transition-all duration-500",
                  expanded ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )}
                style={{
                  width: radius * 2 + 72,
                  height: radius * 2 + 72,
                }}
              />

              {/* Inner glow ring */}
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  "border border-primary/10 transition-all duration-700",
                  expanded ? "scale-100 opacity-100" : "scale-75 opacity-0"
                )}
                style={{
                  width: radius * 2 - 20,
                  height: radius * 2 - 20,
                }}
              />

              {/* ── Centre hub ─────────────────────── */}
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                  "transition-all duration-300",
                  expanded ? "scale-100 opacity-100" : "scale-0 opacity-0"
                )}
              >
                {drilldown ? (
                  <button
                    onClick={handleBack}
                    className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-card/95 border-2 border-border shadow-2xl backdrop-blur-sm hover:bg-accent transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-[8px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wider">
                      Back
                    </span>
                  </button>
                ) : (
                  <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-card/95 border-2 border-border shadow-2xl backdrop-blur-sm">
                    <HappyPanda className="h-10 w-10" />
                    {centerLabel && (
                      <span className="text-[7px] font-bold text-muted-foreground mt-0.5">
                        {centerLabel}
                      </span>
                    )}
                  </div>
                )}

                {drilldown && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-white/80">
                    {drilldown.name}
                  </span>
                )}
              </div>

              {/* ── Nav items ──────────────────────── */}
              {allItems.map((item, i) => {
                const style = getItemStyle(i);
                const isLogout = item.path === "__logout__";
                const hasChildren = Boolean(item.children?.length);
                const active =
                  !hasChildren && !isLogout && isActive(item.path);
                const isHovered = hoveredIndex === i;
                const shortcutNum = i + 1;

                return (
                  <div
                    key={`${drilldown?.name ?? "root"}-${item.name}`}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      ...style,
                      marginLeft: -28,
                      marginTop: -28,
                      transition: getTransition(i),
                    }}
                  >
                    {/* Item button */}
                    <button
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={cn(
                        "relative flex h-14 w-14 items-center justify-center rounded-full",
                        "border-2 shadow-lg backdrop-blur-sm transition-colors duration-200",
                        isLogout
                          ? "bg-red-500/90 text-white border-red-400 hover:bg-red-600"
                          : active
                            ? "bg-primary text-primary-foreground border-primary shadow-primary/30"
                            : "bg-card/90 text-foreground border-border/60 hover:border-primary/50 hover:bg-accent",
                        hasChildren &&
                          !isLogout &&
                          "ring-2 ring-offset-1 ring-offset-transparent ring-primary/20"
                      )}
                      aria-label={`${item.name} (${shortcutNum})`}
                    >
                      {item.icon}

                      {/* Number shortcut badge */}
                      {shortcutNum <= 9 && (
                        <span
                          className={cn(
                            "absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                            isLogout
                              ? "bg-red-700 text-white"
                              : active
                                ? "bg-primary-foreground text-primary"
                                : "bg-foreground/80 text-background"
                          )}
                        >
                          {shortcutNum}
                        </span>
                      )}

                      {/* Children-count badge */}
                      {hasChildren && (
                        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
                          {item.children!.length}
                        </span>
                      )}
                    </button>

                    {/* Tooltip label */}
                    <div
                      className={cn(
                        "absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold shadow-md border pointer-events-none",
                        "transition-all duration-150",
                        isLogout
                          ? "bg-red-500 text-white border-red-400"
                          : "bg-popover text-popover-foreground border-border",
                        "opacity-100 translate-y-0"
                      )}
                    >
                      {item.name}
                      <span className="ml-1.5 opacity-60">
                        ({shortcutNum})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Logout confirmation dialog ───────── */}
            {showLogoutConfirm && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setShowLogoutConfirm(false)}
                />
                <div className="relative bg-card rounded-2xl p-8 shadow-2xl max-w-sm mx-4 text-center border-2 border-border animate-in zoom-in-95 fade-in duration-200">
                  <CryingPanda className="h-28 w-28 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-foreground">
                    Panda will be sad!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Are you sure you want to leave? The panda will miss you...
                  </p>
                  <div className="flex gap-3 mt-6 justify-center">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      Stay!
                    </button>
                    <button
                      onClick={confirmLogout}
                      className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* ── Panda wobble animation ─────────────────── */}
      <style>{`
        @keyframes pandaWobble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-10deg) scale(1.06); }
          30% { transform: rotate(8deg) scale(1.02); }
          45% { transform: rotate(-6deg) scale(1.04); }
          60% { transform: rotate(4deg) scale(1); }
          75% { transform: rotate(-2deg) scale(1.02); }
        }
        .panda-wobble {
          animation: pandaWobble 3s ease-in-out infinite;
        }
        .panda-wobble:hover {
          animation-duration: 1.5s;
        }
      `}</style>
    </>
  );
}
