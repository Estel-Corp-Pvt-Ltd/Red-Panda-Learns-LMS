import { useEffect, useRef, useState } from "react";

type Options = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
};

export function useInView<T extends Element>(options: Options = { threshold: 0.25 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio > 0;
        setInView(visible);
      },
      {
        root: options.root || null,
        rootMargin: options.rootMargin || "0px",
        threshold: options.threshold ?? 0.25,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    options.root,
    options.rootMargin,
    Array.isArray(options.threshold) ? options.threshold.join(",") : options.threshold,
  ]);

    return { ref, inView } as const;
}