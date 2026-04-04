import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { pricingTiers } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SquiggleLine, DoodleStar } from "./Doodles";

export function PricingSection() {
  return (
    <section className="py-20 px-6 bg-pastel-blue relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <DoodleStar className="absolute left-[5%] top-[8%] w-8 text-accent-yellow/25 animate-wiggle" />
        <DoodleStar className="absolute right-[6%] bottom-[10%] w-10 text-accent-lav/25 animate-float float-delay-1" />
      </div>

      <div className="mx-auto max-w-5xl relative">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            Choose Your Plan
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-48 text-accent-sky/30" />
          </div>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted-foreground">
            Start for free, upgrade anytime. All plans include our safe, kid-friendly environment.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3 items-start">
          {pricingTiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 0.15}>
              <div
                className={`sketch-card ${tier.color} p-7 relative ${
                  tier.popular ? "ring-2 ring-accent-coral/40 scale-[1.03] z-10" : ""
                }`}
              >
                {tier.popular && (
                  <span className="best-value-stamp">Best Value!</span>
                )}

                <h3 className="font-extrabold text-foreground font-hand text-2xl">
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground font-hand">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-sm text-muted-foreground">
                      {tier.period}
                    </span>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/75">
                      <Check className="h-4 w-4 shrink-0 text-accent-mint mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.name === "Classroom" ? "/contact-us" : "/auth/signup"}
                  className={`mt-6 block w-full text-center ${
                    tier.popular ? "btn-sketchy" : "btn-sketchy-outline"
                  } text-sm py-2.5`}
                >
                  {tier.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
