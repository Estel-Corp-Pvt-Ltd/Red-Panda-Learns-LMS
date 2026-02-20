import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { parentStickyNotes } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Pushpin, SquiggleLine } from "./Doodles";

export function ForParents() {
  return (
    <section id="for-parents" className="py-20 px-6 paper-bg">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            Trusted by Parents
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-40 text-accent-lav/40" />
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {/* Yellow sticky note */}
          <ScrollReveal delay={0.1}>
            <div className="sticky-note sticky-note-yellow p-8 relative animate-rock" style={{ animationDelay: "0s" }}>
              <Pushpin className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 text-accent-coral" />
              <h3 className="mt-2 font-extrabold text-foreground font-hand text-2xl">
                {parentStickyNotes.safe.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {parentStickyNotes.safe.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="h-4 w-4 shrink-0 text-accent-mint mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Cyan sticky note */}
          <ScrollReveal delay={0.2}>
            <div className="sticky-note sticky-note-cyan p-8 relative animate-rock" style={{ animationDelay: "0.5s" }}>
              <Pushpin className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 text-accent-sky" />
              <h3 className="mt-2 font-extrabold text-foreground font-hand text-2xl">
                {parentStickyNotes.peace.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {parentStickyNotes.peace.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="h-4 w-4 shrink-0 text-accent-mint mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4}>
          <div className="mt-12 text-center">
            <Link to="/auth/signup" className="btn-sketchy text-lg px-8 py-3">
              Create a Free Account
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              No credit card required. Free forever for basic access.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
