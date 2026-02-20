import { impactStats } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SquiggleLine } from "./Doodles";

export function ImpactStats() {
  return (
    <section className="py-20 px-6 notebook-grid">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            Our Impact
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-40 text-accent-mint/40" />
          </div>
        </ScrollReveal>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {impactStats.map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.1}>
              <div className="sketch-card p-6 text-center">
                <div className="text-3xl mb-2">{stat.emoji}</div>
                <div className="font-hand text-4xl font-bold text-foreground">
                  {stat.value.toLocaleString()}{stat.suffix}
                </div>
                <p className="mt-1 text-sm text-muted-foreground font-semibold">
                  {stat.label}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
