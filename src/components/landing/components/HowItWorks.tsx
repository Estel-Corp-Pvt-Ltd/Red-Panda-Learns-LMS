import { howItWorks } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ChalkDoodle, MathDoodle, SquiggleLine } from "./Doodles";

export function HowItWorks() {
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <div className="chalkboard px-6 py-14 sm:px-12 sm:py-16 relative overflow-hidden">
            {/* Chalk decorations */}
            <ChalkDoodle className="absolute top-6 left-6 w-20 text-white/30" />
            <MathDoodle className="absolute top-6 right-6 w-24 text-white/25" />

            <h2 className="text-center font-hand text-4xl font-bold chalk-text sm:text-5xl">
              How It Works
            </h2>
            <div className="flex justify-center mt-3">
              <SquiggleLine className="w-40 text-white/20" />
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step, i) => (
                <ScrollReveal key={step.step} delay={i * 0.15}>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-white/40 text-2xl font-extrabold chalk-text font-hand">
                      {step.step}
                    </div>
                    <div className="mt-3 text-4xl">{step.emoji}</div>
                    <h3 className="mt-3 text-lg font-bold chalk-text">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/60 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Colored chalk pieces */}
            <div className="mt-12 flex items-center justify-center gap-3">
              {["var(--accent-coral)", "var(--accent-mint)", "var(--accent-yellow)", "var(--accent-lav)", "var(--accent-sky)"].map((color, i) => (
                <span
                  key={i}
                  className="inline-block w-10 h-2.5 rounded-sm"
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
