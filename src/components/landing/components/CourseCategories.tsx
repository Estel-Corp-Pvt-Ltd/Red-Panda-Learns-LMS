import { Link } from "react-router-dom";
import { courseAdventures } from "../data/landing-content";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { DoodleArrow, SquiggleLine } from "./Doodles";

export function CourseCategories() {
  return (
    <section className="py-20 px-6 notebook-dots">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="text-center font-hand text-4xl font-bold text-foreground sm:text-5xl">
            Pick Your Learning Adventure!
          </h2>
          <div className="flex justify-center mt-2">
            <SquiggleLine className="w-48 text-accent-coral/40" />
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {courseAdventures.map((cat, i) => (
            <ScrollReveal key={cat.title} delay={i * 0.1}>
              <Link to="/courses" className="block h-full">
                <div className={`sketch-card p-6 text-center h-full`}>
                  <div
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                    style={{ background: cat.bgColor }}
                  >
                    {cat.icon}
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground">
                    {cat.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {cat.tagline}
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.5}>
          <div className="mt-10 flex items-center justify-center gap-2">
            <Link
              to="/courses"
              className="group flex items-center gap-2 font-hand text-xl font-bold text-foreground hover:text-accent-coral transition-colors"
            >
              View All Courses
              <DoodleArrow className="w-12 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
