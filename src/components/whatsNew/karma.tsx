// components/WhatsNew/KarmaTab.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Star, Trophy, Flame, Crown, TrendingUp, Sparkles } from "lucide-react";

// --- NO GSAP: Custom Physics Dot Grid Component ---
const InteractiveDotGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Physics configuration
  const config = {
    dotSize: 2,
    gap: 28,
    color: "rgba(120, 113, 108, 0.3)", // muted-foreground/30
    activeColor: "rgba(245, 158, 11, 1)", // amber-500
    mouseRadius: 120,
    spring: 0.05, // How fast they return
    friction: 0.9, // How much they slow down
    repelStrength: 0.5,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dots: any[] = [];
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    // Initialize Grid
    const init = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // Handle DPI
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      dots = [];
      const cols = Math.floor(width / config.gap);
      const rows = Math.floor(height / config.gap);
      const offsetX = (width - cols * config.gap) / 2;
      const offsetY = (height - rows * config.gap) / 2;

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = offsetX + i * config.gap;
          const y = offsetY + j * config.gap;
          dots.push({
            originX: x,
            originY: y,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            color: config.color, // default color
          });
        }
      }
    };

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      dots.forEach((dot) => {
        // 1. Calculate Distance from Mouse
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 2. Apply Mouse Repulsion Force
        if (distance < config.mouseRadius) {
          const force = (config.mouseRadius - distance) / config.mouseRadius;
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * config.repelStrength * 20; // 20 is arbitrary power
          const pushY = Math.sin(angle) * force * config.repelStrength * 20;

          dot.vx -= pushX;
          dot.vy -= pushY;

          // Color change based on proximity
          dot.color = config.activeColor;
        } else {
          // Revert color slowly (simple switch for performance)
          dot.color = config.color;
        }

        // 3. Apply Spring Force (Return to origin)
        const springDx = dot.originX - dot.x;
        const springDy = dot.originY - dot.y;

        dot.vx += springDx * config.spring;
        dot.vy += springDy * config.spring;

        // 4. Apply Friction
        dot.vx *= config.friction;
        dot.vy *= config.friction;

        // 5. Update Position
        dot.x += dot.vx;
        dot.y += dot.vy;

        // 6. Draw Dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, config.dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      init();
    };

    init();
    animate();

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
};

// --- MAIN COMPONENT ---
const KarmaTab = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Existing Spotlight Logic
  useEffect(() => {
    const container = containerRef.current;
    const spotlight = spotlightRef.current;

    if (!container || !spotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spotlight.style.setProperty("--x", `${x}px`);
      spotlight.style.setProperty("--y", `${y}px`);
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="space-y-12 w-full">
      {/* --- INTRO SECTION --- */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-8 mt-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-amber-500/20">
            <Sparkles className="w-3 h-3" /> New Feature Unlocked
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground">
            Introducing <span className="text-amber-500">Karma</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Your learning journey now has meaning.
            <span className="font-semibold text-foreground mx-1">Karma Points</span>
            are earned course-wise and showcase your dedication.
          </p>
        </div>
      </div>

      {/* --- HERO BRUTALIST BOX WITH DOT GRID --- */}
      <div className="relative group w-full">
        <div
          ref={containerRef}
          className="relative bg-card text-card-foreground p-8 md:p-12 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center"
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 88%, 96% 100%, 0 100%, 0 0)",
          }}
        >
          {/* 1. INTERACTIVE BACKGROUND (Replaces static grid) */}
          <InteractiveDotGrid />

          {/* Heavy Corner Brackets */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-[8px] border-l-[8px] border-amber-500 pointer-events-none z-20" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[8px] border-r-[8px] border-amber-500 pointer-events-none z-20" />

          {/* Spotlight Overlay (Kept from original to add glow on top of dots) */}
          <div
            ref={spotlightRef}
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
            style={
              {
                "--x": "50%",
                "--y": "50%",
                "--size": "300px",
                background: `radial-gradient(circle var(--size) at var(--x) var(--y), rgba(245, 158, 11, 0.05), transparent 100%)`,
              } as React.CSSProperties
            }
          />

          {/* Content Layout */}
          <div className="relative z-20 grid lg:grid-cols-2 gap-12 items-center pointer-events-none">
            {/* Left: Text */}
            <div className="space-y-8 pointer-events-auto">
              <div>
                <h2 className="text-4xl md:text-5xl font-black uppercase leading-[0.9] tracking-tighter mb-4">
                  Build Your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-500/50">
                    Reputation
                  </span>
                </h2>
                <p className="text-xl font-semibold text-foreground leading-relaxed border-l-4 border-amber-500/20 pl-6 backdrop-blur-sm bg-background/30 p-4 rounded-r-md">
                  Each course tracks your karma independently. Your progress and engagement
                  contribute to your standing. <strong>Rise through the ranks</strong> and showcase
                  your expertise.
                </p>
              </div>
            </div>

            {/* Right: Visual Graphic */}
            <div className="hidden lg:flex justify-center relative perspective-1000">
              {/* Glow */}
              <div className="absolute inset-0 bg-amber-500/20 blur-[80px] rounded-full opacity-60" />

              {/* The Karma Card Representation */}
              <div className="relative w-80 bg-background border border-border p-2 rotate-3 group-hover:rotate-0 transition-transform duration-500 ease-out shadow-2xl pointer-events-auto">
                <div className="border-2 border-double border-muted p-6 h-56 flex flex-col items-center justify-center text-center space-y-4 bg-card/80 backdrop-blur-md">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border border-amber-500/20">
                    <Star className="w-8 h-8 text-amber-500 fill-amber-500/20" />
                  </div>
                  <div className="space-y-2 w-full flex flex-col items-center opacity-60">
                    <div className="w-32 h-2.5 bg-foreground rounded-sm" />
                    <div className="w-24 h-2 bg-foreground/50 rounded-sm" />
                  </div>
                  {/* "Stamp" */}
                  <div className="mt-4 px-4 py-1.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md">
                    Karma Leader
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- WHAT IS KARMA --- */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-1.5 bg-amber-500 skew-x-[-12deg]"></div>
          <h3 className="text-2xl font-bold uppercase tracking-wide">What is Karma</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StepCard
            step="01"
            icon={Star}
            title="Course-Based"
            desc="Each course maintains its own karma system. Your reputation is built per subject."
          />
          <StepCard
            step="02"
            icon={Crown}
            title="Recognition"
            desc="We have a course-wise karma leaderboard where top performers are showcased."
          />
        </div>
      </div>
    </div>
  );
};

// --- Helper Component for Steps ---
const StepCard = ({
  step,
  icon: Icon,
  title,
  desc,
}: {
  step: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) => (
  <div className="group relative bg-card p-6 border border-border hover:border-amber-500 transition-colors duration-300 overflow-hidden shadow-sm">
    {/* Large Number Background */}
    <span className="absolute -right-4 -top-6 text-[100px] font-black text-muted/5 select-none group-hover:text-amber-500/5 transition-colors">
      {step}
    </span>

    <div className="relative z-10">
      <div className="w-12 h-12 bg-background border border-border text-foreground flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 group-hover:border-amber-500 group-hover:text-amber-500 transition-all duration-300 rounded-sm">
        <Icon className="w-6 h-6" />
      </div>

      <h4 className="text-xl font-bold uppercase mb-2 tracking-tight">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>

    {/* Bottom Line Accent Animation */}
    <div className="absolute bottom-0 left-0 w-0 h-1 bg-amber-500 group-hover:w-full transition-all duration-500 ease-out" />
  </div>
);

export default KarmaTab;
