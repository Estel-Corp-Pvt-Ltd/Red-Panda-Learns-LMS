"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const impactItems = [
  {
    title: "College Partnerships",
    number: "6",
    description:
      "We have partnered with 6 top universities in Pune. We design the end-to-end aspects including AI curriculum, faculty training, designing the AI lab, and providing the course material and resources.",
  },
  {
    title: "School Partnerships",
    number: "95",
    description:
      "We have partnered with dozens of schools from Maharashtra to implement our teacher training. The program is ongoing and we have received incredibly positive feedback so far.",
  },
  {
    title: "AI teacher training",
    number: "600+",
    description:
      "We have trained & certified 600+ teachers from Jul 23-Aug 24. We have online & offline modes of training for our partner schools. The trained teachers teach AI at their respective schools.",
  },
  {
    title: "CSR partnership",
    number: "1",
    description:
      "We implemented our program at 22 Kerala Govt. schools as a 3-party CSR partnership between Vizuara, UST and Kerala Scheduled Tribes Department. We won the best CSR project-23 award from IIT Madras.",
  },
  {
    title: "Research papers",
    number: "80+",
    description:
      "Over the last 2 years, we have worked with school-level and undergraduate students to work on 80+ research papers and many more research projects.",
  },
  {
    title: "AI apps built",
    number: "50+",
    description:
      "Our school students have built world-class android & iOS apps from scratch. These AI-powered apps were built the final project of our AI student researcher program.",
  },
  {
    title: "VSoC 2025",
    number: "12",
    description:
      "VSoC (Vizuara Summer of Code) was our flagship program of 2025. 12 students built production level apps and worked on high-impact research papers.",
  },
  {
    title: "Students",
    number: "20,000+",
    description:
      "We have numerous students enrolled in our courses. We plan to take our AI program to 50,000+ students by the end of 2024-25 academic year.",
  },
  {
    title: "Countries",
    number: "22",
    description:
      "Vizuara is truly global. Our team hails from different parts of the world. It is amazing how people, irrespective of their physical location can collaborate as a team.",
  },
  {
    title: "Webinars",
    number: "180+",
    description:
      "We are very popular due to the free webinars we conduct. Every month we have 3-4 webinars on AI, grad-school applications and other topics.",
  },
  {
    title: "Grad school",
    number: "1,200+",
    description:
      'We help students apply to grad school by building their research profile. 1,200+ students have benefitted from our program called "flyvidesh".',
  },
  {
    title: "Science labs",
    number: "350+",
    description:
      "We have created a big library of virtual labs and 3D models for teaching science subjects at school. Currently, 10000+ students use our product.",
  },
];

/**
 * CountUp component
 * - Animates number part of a string (supports commas and trailing '+')
 * - Starts when it becomes visible
 * - Respects prefers-reduced-motion
 */
const CountUp = ({
  target,
  duration = 1200,
  delay = 0,
  className,
}: {
  target: string | number;
  duration?: number;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<string>("0");
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const str = String(target).trim();
    const match = str.match(/-?\d[\d,]*(?:\.\d+)?/);
    const before = match && match.index !== undefined ? str.slice(0, match.index) : "";
    const numericPart = match ? match[0] : "0";
    const after = match ? str.slice(match.index! + match[0].length) : "";

    const decimals = numericPart.includes(".")
      ? (numericPart.split(".")[1] || "").length
      : 0;

    const endVal = parseFloat(numericPart.replace(/,/g, "")) || 0;
    const formatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    let started = false;

    const startAnimation = () => {
      if (started || hasAnimated) return;
      started = true;

      if (reduceMotion || duration <= 0) {
        setDisplay(before + formatter.format(endVal) + after);
        setHasAnimated(true);
        return;
      }

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      let startTs: number | null = null;

      const tick = (ts: number) => {
        if (startTs === null) startTs = ts;
        const elapsed = ts - startTs;

        if (elapsed < delay) {
          setDisplay(before + formatter.format(0) + after);
          rafId = requestAnimationFrame(tick);
          return;
        }

        const t = Math.min(1, (elapsed - delay) / duration);
        const eased = easeOutCubic(t);
        const current = endVal * eased;

        setDisplay(before + formatter.format(current) + after);

        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setHasAnimated(true);
        }
      };

      rafId = requestAnimationFrame(tick);
    };

    let observer: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startAnimation();
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.35 }
      );
      observer.observe(element);
    } else {
      startAnimation();
    }

    return () => {
      if (observer) observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay]);

  return (
    <span ref={ref} className={className} aria-label={String(target)}>
      {display}
    </span>
  );
};

const OurImpactSection = () => {
  return (
    <section className="relative flex items-center justify-center py-20 px-4 overflow-hidden bg-background">
      {/* Soft backdrop that adapts to dark mode */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl bg-primary/10 dark:bg-primary/5" />
        <div className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full blur-3xl bg-purple-500/10 dark:bg-purple-400/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-transparent dark:from-white/[0.03] dark:to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <h2 className="text-5xl md:text-6xl font-bold text-center mb-16 text-foreground">
          Our Impact
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {impactItems.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border bg-background/70 dark:bg-background/30 border-foreground/15 dark:border-foreground/20 backdrop-blur-md hover:shadow-lg hover:shadow-foreground/10 dark:hover:shadow-black/30 transition-all duration-300 flex flex-col will-change-transform hover:-translate-y-0.5 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <h3 className="text-primary font-semibold text-lg mb-4">
                {item.title}
              </h3>

              <div className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
                <CountUp
                  target={item.number}
                  duration={1200}
                  className="tabular-nums"
                />
              </div>

              <p className="text-foreground/70 text-sm leading-relaxed">
                {item.description}
              </p>

              {/* Optional CTA */}
              {/* <button className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline underline-offset-4">
                Learn more <ArrowRight className="w-4 h-4" />
              </button> */}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OurImpactSection;