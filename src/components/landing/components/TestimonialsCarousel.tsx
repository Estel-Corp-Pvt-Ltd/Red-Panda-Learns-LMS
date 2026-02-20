import { Star } from "lucide-react";
import { testimonials } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SquiggleLine, DoodleHeart } from "./Doodles";

export function TestimonialsCarousel() {
  return (
    <section className="py-20 px-6 paper-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <DoodleHeart className="absolute right-[5%] top-[10%] w-8 text-accent-coral/20 animate-float" />
        <DoodleHeart className="absolute left-[8%] bottom-[15%] w-6 text-accent-coral/15 animate-float float-delay-2" />
      </div>

      <div className="mx-auto max-w-6xl relative">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            What Our Friends Say
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-48 text-accent-sky/30" />
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.id} delay={i * 0.15}>
              <div className={`sketch-card ${t.bgColor} p-7 h-full flex flex-col`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground/10 bg-background text-2xl">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>

                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent-yellow text-accent-yellow" />
                  ))}
                </div>

                <blockquote className="text-sm text-foreground/75 italic leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
