import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Horizontal "ticker tape" reading experience.
 *
 * One long sentence flows left → right inside a single flex track. Words,
 * SVG curves and emoji icons all sit on the same baseline so the visuals act
 * like punctuation between phrases instead of slide breaks.
 *
 * Animation system (all GSAP / ScrollTrigger):
 *   1. The whole section is pinned. Vertical scroll is converted to horizontal
 *      translation of the inner track via a single tween → `containerTween`.
 *   2. Every other animation in the section uses `containerAnimation:
 *      containerTween`, so ScrollTrigger evaluates start/end against horizontal
 *      position inside the moving track instead of vertical scroll.
 *   3. Words fade + lift in as they cross the right edge.
 *   4. Highlighted words shift color (grey → red) and scale up at center.
 *   5. SVG paths "draw" via stroke-dashoffset.
 *   6. Icons rotate as they cross AND float independently on a yoyo loop.
 *   7. A small progress bar at the top tracks total horizontal progress.
 */

const PRIMARY = "#e43636";
const GOLD = "#C4A35A";
const TEAL = "#5FE1D8";
const ORANGE = "#FF8A50";
const PINK = "#D4727A";

interface TickerSvgProps {
  d: string;
  viewBox: string;
  color: string;
  className?: string;
  strokeWidth?: number;
}

function TickerSvg({
  d,
  viewBox,
  color,
  className = "",
  strokeWidth = 6,
}: TickerSvgProps) {
  return (
    <svg
      viewBox={viewBox}
      className={`flex-shrink-0 ${className}`}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className="ticker-draw"
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HorizontalTicker() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const progressBar = progressRef.current;
    if (!section || !track) return;

    // gsap.context scopes selectors to this section and gives us a single
    // revert() call that tears down every tween + ScrollTrigger on unmount.
    const ctx = gsap.context(() => {
      const distance = () => track.scrollWidth - window.innerWidth;

      // 1. The horizontal scroll itself: pin the section and translate the
      //    track from x:0 to x:-(scrollWidth - viewport).
      const containerTween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (progressBar) {
              progressBar.style.transform = `scaleX(${self.progress})`;
            }
          },
        },
      });

      // 2. Per-item entrance: each ticker item drifts up + fades in as it
      //    enters the right side of the viewport.
      gsap.utils.toArray<HTMLElement>(".ticker-item").forEach((item) => {
        gsap.fromTo(
          item,
          { opacity: 0.1, yPercent: 60, scale: 0.85 },
          {
            opacity: 1,
            yPercent: 0,
            scale: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              containerAnimation: containerTween,
              start: "left 95%",
              end: "left 50%",
              scrub: true,
            },
          }
        );
      });

      // 3. Highlighted words: shift color + grow as they reach center.
      gsap.utils.toArray<HTMLElement>(".ticker-highlight").forEach((el) => {
        gsap.fromTo(
          el,
          { color: "#cfcfcf", scale: 0.85, letterSpacing: "-0.04em" },
          {
            color: PRIMARY,
            scale: 1.18,
            letterSpacing: "0em",
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              containerAnimation: containerTween,
              start: "left 80%",
              end: "left 35%",
              scrub: true,
            },
          }
        );
      });

      // 4. SVG paths: classic stroke-dashoffset draw-on as the path crosses.
      gsap.utils.toArray<SVGPathElement>(".ticker-draw").forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: path,
            containerAnimation: containerTween,
            start: "left 95%",
            end: "left 30%",
            scrub: true,
          },
        });
      });

      // 5. Icons rotate one full turn while they're inside the viewport.
      gsap.utils.toArray<HTMLElement>(".ticker-spin").forEach((el) => {
        gsap.to(el, {
          rotate: 360,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            containerAnimation: containerTween,
            start: "left right",
            end: "right left",
            scrub: true,
          },
        });
      });

      // 6. Independent floating loop for icons (decoupled from scroll). Uses
      //    `y` while the entrance uses `yPercent`, so they don't fight.
      gsap.to(".ticker-float", {
        y: -18,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.25, from: "random" },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-background"
    >
      <div className="relative flex h-screen w-screen items-center">
        {/* Top progress bar */}
        <div className="absolute left-1/2 top-10 z-30 h-1.5 w-64 -translate-x-1/2 overflow-hidden rounded-full bg-foreground/10">
          <div
            ref={progressRef}
            className="h-full w-full origin-left rounded-full"
            style={{ background: PRIMARY, transform: "scaleX(0)" }}
          />
        </div>
        <div className="absolute left-1/2 top-16 z-30 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          scroll&nbsp;&nbsp;→&nbsp;&nbsp;to read
        </div>

        {/* The single horizontal track */}
        <div
          ref={trackRef}
          className="flex items-center gap-14 whitespace-nowrap will-change-transform"
          style={{ paddingLeft: "50vw", paddingRight: "50vw" }}
        >
          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            In every spark of curiosity
          </span>

          {/* Big squiggly comma */}
          <TickerSvg
            viewBox="0 0 240 60"
            d="M 5 30 C 35 0, 65 60, 95 30 S 155 0, 185 30 S 235 60, 235 30"
            color={PRIMARY}
            className="h-20 w-52"
          />

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            we discover the playful
          </span>

          <span className="ticker-item ticker-float ticker-spin select-none text-7xl">
            📖
          </span>

          <span className="ticker-item ticker-highlight font-hand text-7xl font-extrabold sm:text-8xl">
            Wonder
          </span>

          {/* Zigzag */}
          <TickerSvg
            viewBox="0 0 220 60"
            d="M 5 30 L 35 8 L 65 52 L 95 8 L 125 52 L 155 8 L 185 52 L 215 30"
            color={GOLD}
            className="h-16 w-48"
            strokeWidth={5}
          />

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            of learning
          </span>

          <span className="ticker-item ticker-float select-none text-6xl">
            ✨
          </span>

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            that turns small questions
          </span>

          {/* Looping curve */}
          <TickerSvg
            viewBox="0 0 200 100"
            d="M 10 80 C 30 0, 80 0, 100 80 C 120 0, 170 0, 190 80"
            color={TEAL}
            className="h-24 w-44"
          />

          <span className="ticker-item ticker-float ticker-spin select-none text-7xl">
            💡
          </span>

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            into big ideas
          </span>

          {/* Arrow */}
          <TickerSvg
            viewBox="0 0 200 60"
            d="M 5 30 L 170 30 M 145 8 L 175 30 L 145 52"
            color={ORANGE}
            className="h-16 w-48"
            strokeWidth={7}
          />

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            bold creators
          </span>

          <span className="ticker-item ticker-float select-none text-7xl">
            🚀
          </span>

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            and brilliant
          </span>

          {/* Heart loop */}
          <TickerSvg
            viewBox="0 0 120 100"
            d="M 60 90 C 0 60, 0 10, 30 10 C 45 10, 60 25, 60 40 C 60 25, 75 10, 90 10 C 120 10, 120 60, 60 90 Z"
            color={PINK}
            className="h-20 w-24"
            strokeWidth={5}
          />

          <span className="ticker-item font-hand text-6xl font-bold text-foreground sm:text-7xl">
            futures, built
          </span>

          {/* Star */}
          <TickerSvg
            viewBox="0 0 100 100"
            d="M 50 5 L 61 39 L 95 39 L 67 60 L 78 95 L 50 73 L 22 95 L 33 60 L 5 39 L 39 39 Z"
            color={PRIMARY}
            className="h-24 w-24"
            strokeWidth={5}
          />

          <span className="ticker-item ticker-highlight font-hand text-8xl font-extrabold sm:text-9xl">
            Together.
          </span>
        </div>
      </div>
    </section>
  );
}
