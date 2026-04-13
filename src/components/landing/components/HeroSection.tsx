import { Link } from "react-router-dom";
import { heroContent } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  DoodleCloud,
  DoodleStar,
  DoodlePencil,
  WavyUnderline,
  SquiggleLine,
  DoodleSpiral,
  DoodleArrow,
} from "./Doodles";
import { WordRotator } from "./WordRotator";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40 notebook-grid">
      {/* Floating doodle accents */}
      <div className="pointer-events-none absolute inset-0">
        <DoodleCloud className="absolute left-[5%] top-[12%] w-20 text-accent-yellow/40 animate-float" />
        <DoodleStar className="absolute right-[8%] top-[15%] w-10 text-accent-coral/50 animate-float float-delay-1" />
        <DoodlePencil className="absolute right-[12%] bottom-[18%] w-8 text-accent-lav/40 animate-float float-delay-2 rotate-12" />
        <DoodleCloud className="absolute left-[12%] bottom-[15%] w-16 text-accent-mint/30 animate-float float-delay-3" />
        <DoodleStar className="absolute left-[45%] top-[8%] w-8 text-accent-yellow/35 animate-wiggle" />
        <DoodleSpiral className="absolute right-[25%] top-[10%] w-12 text-accent-sky/25 animate-float float-delay-4" />
        <SquiggleLine className="absolute left-[3%] top-[50%] w-24 text-accent-coral/20 rotate-[-8deg]" />
        <SquiggleLine className="absolute right-[5%] bottom-[40%] w-20 text-accent-sky/20 rotate-[5deg]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          {/* Animated Panda with power-on effect */}
          <div className="mb-8 flex justify-center">
            <AnimatedPanda />
          </div>

          {/* Main headline with word rotator */}
          <h1 className="font-hand text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-8xl leading-tight">
            Make it <WordRotator />
          </h1>

          {/* Sub-headline */}
          <p className="relative mt-4 inline-block font-hand text-2xl sm:text-3xl text-foreground/70">
            <span className="relative">
              {heroContent.headlineAccent}
              <WavyUnderline className="absolute -bottom-2 left-0 w-full h-4 text-accent-coral" />
            </span>
          </p>

          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed font-sans">
            {heroContent.subheadline}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/auth/signup" className="btn-sketchy text-lg px-8 py-3">
              {heroContent.primaryCta.text}
              <DoodleArrow className="inline-block w-8 ml-1" />
            </Link>
            <Link
              to="#for-parents"
              className="btn-sketchy-outline text-lg px-8 py-3"
            >
              {heroContent.secondaryCta.text}
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-16 flex justify-center">
          <SquiggleLine className="w-40 text-foreground/10" />
        </div>
      </div>
    </section>
  );
}
