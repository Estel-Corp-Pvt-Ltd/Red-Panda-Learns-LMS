"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
} from "framer-motion";
import { X } from "lucide-react";
import MapAvatarGeo from "../components/MapAvatarGeo";

export type Purchase = {
  id: string | number;
  course: string;
  buyer?: string;
  location?: string;
  timeAgo?: string;
  href?: string;
  mapUrl?: string | null;
  lat?: number;
  lon?: number;
};

type Props = {
  items: Purchase[];
  start: boolean;
  showMs?: number;
  gapMs?: number;
  outMs?: number;
  loop?: boolean;
  avoidBottomPx?: number;
};

export default function RecentPurchasesToasts({
  items,
  start,
  showMs = 5000,
  gapMs = 5000,
  outMs = 220,
  loop = true,
  avoidBottomPx = 0,
}: Props) {
  const list = useMemo(() => items ?? [], [items]);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  // Responsive avatar size (phone smaller)
  const [isPhone, setIsPhone] = useState<boolean>(true);
  useEffect(() => {
    const set = () => setIsPhone(window.innerWidth < 768);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  const avatarSize = isPhone ? 40 : 48;

  // Prefetch first maps for instant render (capped wait)
  const [prefetched, setPrefetched] = useState(false);
  const alreadyPrefetched = useRef<Set<string>>(new Set());
  const prefetch = (url: string) =>
    new Promise<void>((resolve) => {
      if (!url || alreadyPrefetched.current.has(url)) return resolve();
      const img = new Image();
      // @ts-ignore
      img.fetchPriority = "high";
      img.onload = () => {
        alreadyPrefetched.current.add(url);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (prefetched) return;
      const urls = list.map((i) => i.mapUrl).filter(Boolean) as string[];
      if (urls.length === 0) {
        setPrefetched(true);
        return;
      }
      const cap = new Promise<void>((res) => setTimeout(res, 700));
      await Promise.race([Promise.all(urls.slice(0, 2).map(prefetch)), cap]);
      if (!cancelled) setPrefetched(true);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [list, prefetched]);

  // progress bar (1 -> 0 while visible)
  const scaleX = useMotionValue(1);
  const progressAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const remainingRef = useRef(showMs);
  const startedAtRef = useRef<number | null>(null);

  const cleanProgress = () => {
    progressAnimRef.current?.stop();
    progressAnimRef.current = null;
  };

  const startProgress = (ms: number, onComplete: () => void) => {
    cleanProgress();
    startedAtRef.current = performance.now();
    scaleX.set(1);
    progressAnimRef.current = animate(scaleX, 0, {
      duration: ms / 1000,
      ease: "linear",
      onComplete,
    });
  };

  const startItem = (i: number) => {
    if (!list.length) return;
    setIdx(i);
    setShow(true);
    startProgress(showMs, () => {
      setShow(false);
      setTimeout(() => {
        const next = i + 1;
        if (next < list.length) startItem(next);
        else if (loop) startItem(0);
        else setRunning(false);
      }, outMs + gapMs);
    });
  };

  // Start when parent says so
  useEffect(() => {
    if (start && !running && list.length) {
      setRunning(true);
      startItem(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, list.length]);

  // cleanup
  useEffect(() => () => cleanProgress(), []);

  // hover pause/resume
  const onMouseEnter = () => {
    if (!show) return;
    setPaused(true);
    const elapsed = startedAtRef.current
      ? performance.now() - startedAtRef.current
      : 0;
    remainingRef.current = Math.max(0, showMs - elapsed);
    cleanProgress();
  };

  const onMouseLeave = () => {
    if (!show || remainingRef.current <= 0) return;
    setPaused(false);
    startProgress(remainingRef.current, () => {
      setShow(false);
      setTimeout(() => {
        const next = idx + 1;
        if (next < list.length) startItem(next);
        else if (loop) startItem(0);
        else setRunning(false);
      }, outMs + gapMs);
    });
  };

  // User closes -> stop current sequence
  const hardClose = () => {
    cleanProgress();
    setShow(false);
    setRunning(false);
  };

  const item = list[idx];

  // Avatar prefers precomputed mapUrl; fallback to MapAvatarGeo (no fake place)
  const Avatar = ({ it }: { it: Purchase }) => {
    if (it.mapUrl) {
      return (
        <img
          src={it.mapUrl}
          alt={it.location ? `Map of ${it.location}` : "Map"}
          className="rounded-xl object-cover shadow-md ring-2 ring-foreground/10"
          style={{
            width: avatarSize,
            height: avatarSize,
            filter: "contrast(1.1) saturate(1.05)",
          }}
          loading="eager"
          // @ts-ignore
          fetchpriority="high"
          decoding="sync"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement("div");
              fallback.className =
                "rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 ring-2 ring-foreground/10";
              fallback.style.width = `${avatarSize}px`;
              fallback.style.height = `${avatarSize}px`;
              parent.appendChild(fallback);
            }
          }}
        />
      );
    }

    // Only pass place if we actually have one; no hardcoded default
    const place =
      it.location && it.location.trim().length > 0 ? it.location : undefined;

    return (
      <MapAvatarGeo
        lat={it.lat}
        lon={it.lon}
        place={place}
        size={avatarSize}
        zoom={14}
        // prefer="osm" // uncomment to force OSM even if Geoapify key exists
      />
    );
  };

  // Build meta: only show location if we have it (no default city)
  const meta = useMemo(() => {
    const parts: string[] = [];
    if (item?.location) parts.push(item.location);
    if (item?.timeAgo) parts.push(item.timeAgo);
    return parts.join(" • ");
  }, [item?.location, item?.timeAgo]);

  // Dynamic bottom offset: base + safe-area + avoidBottomPx
  const baseBottom = isPhone ? 12 : 20;
  const computedBottom = `calc(env(safe-area-inset-bottom, 0px) + ${
    baseBottom + (avoidBottomPx || 0)
  }px)`;

  return (
    <div
      className="fixed left-3 md:left-6 z-[60] pointer-events-none"
      style={{ bottom: computedBottom }}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {show && item && (
          <motion.div
            key={item.id}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            initial={{
              opacity: 0,
              scale: 0.8,
              rotate: -5,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              rotate: 5,
              y: -20,
            }}
            transition={{
              type: "spring",
              duration: 0.6,
              bounce: 0.3,
            }}
            className="pointer-events-auto select-none"
          >
            {/* Card: smaller on phones, larger from md up */}
            <div className="w-[86vw] max-w-[300px] md:max-w-none md:w-[340px] rounded-2xl border border-foreground/10 bg-white/95 dark:bg-gray-900/90 shadow-2xl shadow-foreground/10 backdrop-blur-xl overflow-hidden relative">
              <div className="p-3 pr-8 md:p-4 md:pr-10">
                <div className="flex items-start gap-2.5 md:gap-3">
                  {/* Map avatar */}
                  <div className="relative">
                    <Avatar it={item} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Meta line: no default city */}
                    {meta && (
                      <div className="text-[11px] md:text-xs text-foreground/60 truncate">
                        {meta}
                      </div>
                    )}

                    <div className="mt-0.5 md:mt-1 font-semibold text-foreground leading-snug text-sm md:text-base">
                      {item.buyer
                        ? `${item.buyer} enrolled in `
                        : "New enrollment "}
                      <a href={item.href}>
                        <span className="text-primary break-words">
                          {item.course}
                        </span>
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      hardClose();
                    }}
                    aria-label="Close"
                    className="absolute right-1.5 top-1.5 md:right-2 md:top-2 p-1 rounded-md hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-all duration-200 hover:rotate-90"
                  >
                    <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar (thinner on phones) */}
              <div className="h-0.5 md:h-1 bg-foreground/[0.08]">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-violet-500"
                  style={{
                    scaleX,
                    transformOrigin: "left",
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
