import { progressBars, stickerBook } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { DoodleStar, SquiggleLine } from "./Doodles";
import { Lock } from "lucide-react";

export function ProgressRewards() {
  return (
    <section className="py-20 px-6 bg-pastel-yellow relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <DoodleStar className="absolute left-[6%] top-[10%] w-8 text-accent-coral/30 animate-wiggle" />
        <DoodleStar className="absolute right-[8%] bottom-[12%] w-10 text-accent-lav/30 animate-float float-delay-2" />
      </div>

      <div className="mx-auto max-w-5xl relative">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            Collect Panda Points & Badges!
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-48 text-accent-coral/30" />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Every lesson you finish earns you points. Unlock achievements and fill your sticker book!
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* Progress Bars */}
          <ScrollReveal delay={0.1}>
            <div className="sketch-card p-8">
              <h3 className="font-bold text-foreground mb-6 font-hand text-xl">
                Your Progress 🐼
              </h3>
              <div className="space-y-6">
                {progressBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-center justify-between text-sm font-bold text-muted-foreground mb-2">
                      <span>{bar.label}</span>
                      <span>{bar.progress}%</span>
                    </div>
                    <div className="h-5 w-full overflow-hidden rounded-full border-2 border-foreground/10 bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${bar.progress}%`, background: bar.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Sticker Book */}
          <ScrollReveal delay={0.2}>
            <div className="sketch-card p-8">
              <h3 className="font-bold text-foreground mb-6 font-hand text-xl">
                Your Sticker Book
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {stickerBook.map((sticker) => (
                  <div
                    key={sticker.label}
                    className={`relative flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-transform border-2 ${
                      sticker.unlocked
                        ? "bg-pastel-mint border-accent-mint/30 hover:scale-105"
                        : "bg-secondary/50 border-border opacity-50"
                    }`}
                  >
                    <span className="text-3xl">
                      {sticker.unlocked ? sticker.emoji : ""}
                    </span>
                    {!sticker.unlocked && (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="text-xs font-bold text-muted-foreground">
                      {sticker.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
