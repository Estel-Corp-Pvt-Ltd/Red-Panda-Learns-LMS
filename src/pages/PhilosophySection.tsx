import React, { useEffect, useRef, useState } from "react";
import { Layers, Code2, Brain, LucideIcon } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useInView } from "./useInView";

// Decryption config (shared by code + math)
const DECRYPTION_CONFIG = {
  SCRAMBLE_INTERVAL: 30,
  TIME_PER_LINE: 800,
  LINE_TRANSITION_DELAY: 150,
};

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(){}[]<>?/\\|=-+";

// Types
interface PhilosophyItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

interface Pulse {
  id: number;
  cardIndex: number;
}

interface DecryptedLineProps {
  text: string;
  delay?: number;
  fixedDuration?: number;
  onComplete?: () => void;
  bold?: boolean;
}

interface DecryptedCodeLineByLineProps {
  text: string;
  startTrigger: number;
}

interface DecryptedMathLineProps {
  latex: string;
  delay?: number;
  fixedDuration?: number;
  onComplete?: () => void;
}

interface DecryptedMathLineByLineProps {
  lines: string[];
  startTrigger: number;
}

interface ResearchPaper {
  title: string;
  authors: string;
  venue?: string;
  year?: number | string;
  link: string;
}

// Scholar items (add more as needed)
const researchPapers: ResearchPaper[] = [
  {
    title: "Decoders Laugh as Loud as Encoders",
    authors: "E Borodach, R Dandekar, R Dandekar, S Panat",
    venue: "arXiv",
    year: 2025,
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=qq8OirYAAAAJ&sortby=pubdate&citation_for_view=qq8OirYAAAAJ:ZeXyd9-uunAC",
  },
];

// Show at most 2 research papers (fits without scroll)
const MAX_PAPERS = 2;

// Keep the same mono font & sizing across all content areas
const CONTENT_FONT_CLASS = "font-mono text-[13px] leading-[1.6]";

const philosophyItems: PhilosophyItem[] = [
  {
    icon: Layers,
    title: "Foundations",
    description:
      "Deep foundational knowledge wins over fluff and shortcuts. Timeless knowledge sustains over latest fad.",
    color: "#fbb03b",
    gradient: "from-[#fbb03b] to-[#ff9500]",
  },
  {
    icon: Code2,
    title: "Practicals",
    description:
      "Hands-on experience and building from scratch is the best way to master AI concepts and models.",
    color: "#29abe2",
    gradient: "from-[#29abe2] to-[#0088cc]",
  },
  {
    icon: Brain,
    title: "Research",
    description:
      "We are trying to push the boundaries of AI through research and innovation.",
    color: "#ff00ff",
    gradient: "from-[#ff00ff] to-[#cc00cc]",
  },
];

// Foundations (LaTeX) — will render in the same mono style
const foundationLatexLines = [
  String.raw`\textbf{Neural Network}`,
  String.raw`\mathbf{z} = \mathbf{W}\mathbf{x} + \mathbf{b}`,
  String.raw`\mathbf{a} = \sigma(\mathbf{z})`,
  String.raw`\textbf{Loss Function}`,
  String.raw`\mathcal{L} = - \sum_{i} y_i \log \hat{y}_i`,
  String.raw`\textbf{Gradient}`,
  String.raw`\frac{\partial \mathcal{L}}{\partial \mathbf{W}} = \delta \mathbf{x}^\top`,
];

const attentionSnippet = `# Attention Mechanism
def attention(q, k, v):
    d = q.size(-1)
    scores = q @ k.T / sqrt(d)
    attn = softmax(scores)
    out = attn @ v
    return out`;

const DecryptedLine: React.FC<DecryptedLineProps> = ({
  text,
  delay = 0,
  fixedDuration,
  onComplete,
  bold = false,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const initialDelayRef = useRef(delay);
  const onCompleteRef = useRef<() => void>(() => {});
  const didCompleteRef = useRef(false);

  const charRevealSpeed = fixedDuration
    ? Math.max(15, Math.floor(fixedDuration / Math.max(1, text.length)))
    : 25;

  useEffect(() => {
    onCompleteRef.current = onComplete ?? (() => {});
  }, [onComplete]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setHasStarted(true),
      initialDelayRef.current
    );
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    if (currentIndex >= text.length) {
      setDisplayedText(text);
      if (!didCompleteRef.current) {
        didCompleteRef.current = true;
        window.setTimeout(() => onCompleteRef.current(), 50);
      }
      return;
    }

    const scrambleInterval = window.setInterval(() => {
      setDisplayedText(() => {
        let result = "";
        for (let i = 0; i < text.length; i++) {
          if (i < currentIndex) result += text[i];
          else if (text[i] === " ") result += " ";
          else result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        return result;
      });
    }, DECRYPTION_CONFIG.SCRAMBLE_INTERVAL);

    const progressTimeout = window.setTimeout(() => {
      setCurrentIndex((p) => p + 1);
    }, charRevealSpeed);

    return () => {
      window.clearInterval(scrambleInterval);
      window.clearTimeout(progressTimeout);
    };
  }, [hasStarted, currentIndex, text, charRevealSpeed]);

  return (
    <div
      className={`${CONTENT_FONT_CLASS} ${
        bold ? "font-semibold" : "font-normal"
      } text-foreground/80 text-left`}
    >
      {displayedText || " "}
    </div>
  );
};

const DecryptedMathLine: React.FC<DecryptedMathLineProps> = ({
  latex,
  delay = 0,
  fixedDuration,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const renderedRef = useRef<HTMLDivElement>(null);

  const initialDelayRef = useRef(delay);
  const onCompleteRef = useRef<() => void>(() => {});
  const didCompleteRef = useRef(false);

  const charRevealSpeed = fixedDuration
    ? Math.max(15, Math.floor(fixedDuration / Math.max(1, latex.length)))
    : 25;

  useEffect(() => {
    onCompleteRef.current = onComplete ?? (() => {});
  }, [onComplete]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setHasStarted(true),
      initialDelayRef.current
    );
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    if (currentIndex >= latex.length) {
      setDisplayedText(latex);
      setIsComplete(true);
      if (!didCompleteRef.current) {
        didCompleteRef.current = true;
        window.setTimeout(() => onCompleteRef.current(), 50);
      }
      return;
    }

    const scrambleInterval = window.setInterval(() => {
      setDisplayedText(() => {
        let result = "";
        for (let i = 0; i < latex.length; i++) {
          if (i < currentIndex) result += latex[i];
          else if (latex[i] === " ") result += " ";
          else result += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        return result;
      });
    }, DECRYPTION_CONFIG.SCRAMBLE_INTERVAL);

    const progressTimeout = window.setTimeout(() => {
      setCurrentIndex((p) => p + 1);
    }, charRevealSpeed);

    return () => {
      window.clearInterval(scrambleInterval);
      window.clearTimeout(progressTimeout);
    };
  }, [hasStarted, currentIndex, latex, charRevealSpeed]);

  useEffect(() => {
    if (!isComplete || !renderedRef.current) return;
    try {
      katex.render(latex, renderedRef.current, {
        displayMode: false,
        throwOnError: false,
        strict: "ignore",
        trust: true,
      });
    } catch {
      if (renderedRef.current) renderedRef.current.textContent = latex;
    }
  }, [isComplete, latex]);

  return isComplete ? (
    <div
      ref={renderedRef}
      className={`${CONTENT_FONT_CLASS} text-left text-foreground katex-line`}
    />
  ) : (
    <div className={`${CONTENT_FONT_CLASS} text-foreground/80 text-left`}>
      {displayedText || " "}
    </div>
  );
};

const DecryptedCodeLineByLine: React.FC<DecryptedCodeLineByLineProps> = ({
  text,
  startTrigger,
}) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const lines = text.split("\n");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startTrigger > 0 && !startedRef.current) {
      startedRef.current = true;
      setVisibleLines(1);
    }
  }, [startTrigger]);

  const handleLineComplete = (index: number) => {
    if (index < lines.length - 1) {
      window.setTimeout(
        () => setVisibleLines(index + 2),
        DECRYPTION_CONFIG.LINE_TRANSITION_DELAY
      );
    }
  };

  return (
    <>
      {lines.map((line, i) =>
        i < visibleLines ? (
          <DecryptedLine
            key={`${startTrigger}-${i}`}
            text={line || " "}
            fixedDuration={DECRYPTION_CONFIG.TIME_PER_LINE}
            onComplete={() => handleLineComplete(i)}
          />
        ) : (
          <div key={`${startTrigger}-spacer-${i}`} className="h-[1.6em]" />
        )
      )}
    </>
  );
};

const DecryptedMathLineByLine: React.FC<DecryptedMathLineByLineProps> = ({
  lines,
  startTrigger,
}) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startTrigger > 0 && !startedRef.current) {
      startedRef.current = true;
      setVisibleLines(1);
    }
  }, [startTrigger]);

  const handleLineComplete = (index: number) => {
    if (index < lines.length - 1) {
      window.setTimeout(
        () => setVisibleLines(index + 2),
        DECRYPTION_CONFIG.LINE_TRANSITION_DELAY
      );
    }
  };

  return (
    <div>
      {lines.map((latex, i) =>
        i < visibleLines ? (
          <DecryptedMathLine
            key={`${startTrigger}-${i}`}
            latex={latex}
            fixedDuration={DECRYPTION_CONFIG.TIME_PER_LINE}
            onComplete={() => handleLineComplete(i)}
          />
        ) : (
          <div key={`${startTrigger}-spacer-${i}`} className="h-[1.6em]" />
        )
      )}
    </div>
  );
};

const PhilosophySection: React.FC = () => {
  // Observe when this section is in view; retrigger every time
  const { ref: sectionRef, inView } = useInView<HTMLElement>({
    threshold: 0.25,
  });

  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [decryptionTrigger, setDecryptionTrigger] = useState(0);

  const timeoutsRef = useRef<number[]>([]);
  const intervalsRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    intervalsRef.current.forEach((id) => window.clearInterval(id));
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    intervalsRef.current = [];
    timeoutsRef.current = [];
  };

  // Re-trigger decrypt + start pulses every time the section enters view
  useEffect(() => {
    if (!inView) {
      clearAllTimers();
      return;
    }

    // Restart all decryption animations
    const tick = Date.now();
    setDecryptionTrigger(tick);

    // Initial staggered pulses
    philosophyItems.forEach((_, index) => {
      const t = window.setTimeout(() => createPulse(index), index * 250);
      timeoutsRef.current.push(t);
    });

    // Repeating pulses while in view
    const intervalId = window.setInterval(() => {
      philosophyItems.forEach((_, index) => {
        const t = window.setTimeout(() => createPulse(index), index * 250);
        timeoutsRef.current.push(t);
      });
    }, 4000);
    intervalsRef.current.push(intervalId);

    return () => {
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const createPulse = (cardIndex: number) => {
    const id = Date.now() + cardIndex + Math.floor(Math.random() * 1000);
    setPulses((prev) => [...prev, { id, cardIndex }]);
    const t = window.setTimeout(
      () => setPulses((prev) => prev.filter((p) => p.id !== id)),
      1500
    );
    timeoutsRef.current.push(t);
  };

  const handleCardHover = (index: number, enter: boolean) => {
    if (enter) setHoveredCard(index);
    else setHoveredCard(null);
  };

  return (
    <>
      <style>{`
        /* Force KaTeX to use the same mono font as code/research for consistent style */
        .katex, .katex .mord, .katex .mbin, .katex .mrel, .katex .mop,
        .katex .mopen, .katex .mclose, .katex .minner, .katex .text,
        .katex .mathrm, .katex .mathit, .katex .mathbf, .katex .textbf, .katex .bold {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          font-size: 13px !important;
          line-height: 1.6 !important;
          font-weight: 400 !important;
        }
        .katex-display { margin: 0 !important; }
        .clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Only the rotating ring behind the circle on hover */
        @keyframes ring-rotate {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .rotating-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          width: calc(100% + 18px);
          height: calc(100% + 18px);
          border-radius: 9999px;
          /* colored arc with transparent remainder */
          background: conic-gradient(currentColor 0deg 80deg, transparent 80deg 360deg);
          /* make it a thin ring */
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
                  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
          animation: ring-rotate 1.6s linear infinite;
          pointer-events: none;
          z-index: 0;
          filter: drop-shadow(0 0 8px currentColor);
        }

        /* Existing pulse ring (auto pulses) */
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(0,0,0,0); opacity: 0.9; }
          50%  { box-shadow: 0 0 24px 6px rgba(0,0,0,0.08); opacity: 0.5; }
          100% { box-shadow: 0 0 64px 18px rgba(0,0,0,0); opacity: 0; }
        }
      `}</style>

      <section ref={sectionRef} className="relative py-24 px-6 overflow-hidden">
        <div className="container relative mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground mb-4">
              Our Philosophy
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto font-light">
              At Vizuara, internally we call this the F-P-R approach
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {philosophyItems.map((item, index) => {
              const isHovered = hoveredCard === index;
              const Icon = item.icon;

              return (
                <div
                  key={index}
                  className="relative h-full flex"
                  onMouseEnter={() => handleCardHover(index, true)}
                  onMouseLeave={() => handleCardHover(index, false)}
                >
                  <div className="relative w-full p-10 bg-background/80 backdrop-blur-sm rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-all duration-300 group hover:shadow-xl flex flex-col h-full">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-6">
                        <div
                          className={`relative p-5 bg-gradient-to-br ${item.gradient} rounded-full transition-all duration-500`}
                          style={{
                            boxShadow: isHovered
                              ? `0 0 30px ${item.color}, 0 8px 24px ${item.color}80`
                              : `0 4px 12px ${item.color}60`,
                            transform: isHovered ? "scale(1.2)" : "scale(1)",
                          }}
                        >
                          {/* Rotating ring behind the circle (hover only) */}
                          {isHovered && (
                            <span
                              className="rotating-ring"
                              style={{ color: item.color }}
                            />
                          )}

                          {/* Icon */}
                          <Icon className="w-10 h-10 text-white relative z-10" />
                        </div>
                      </div>

                      <h3
                        className="text-2xl font-semibold mb-3"
                        style={{
                          color: isHovered ? item.color : "var(--foreground)",
                          textShadow: isHovered
                            ? `0 2px 8px ${item.color}40`
                            : "none",
                        }}
                      >
                        {item.title}
                      </h3>

                      <p className="text-foreground/70 leading-relaxed font-light  min-h-[48px]">
                        {item.description}
                      </p>
                    </div>

                    {/* Content area (same height + same font across all) */}
                    <div className="mt-6 w-full flex-1">
                      <div
                        className="relative rounded-xl border bg-foreground/[0.04] dark:bg-background/40 border-foreground/10 overflow-hidden h-[220px]"
                        style={{ boxShadow: `0 4px 18px ${item.color}22` }}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                          </div>
                        </div>

                        <div className="p-5 h-[calc(220px-40px)] text-left">
                          {index === 2 ? (
                            <div className="text-left h-full flex flex-col">
                              <div
                                className={`${CONTENT_FONT_CLASS} flex-1 pr-0 space-y-2.5`}
                              >
                                {researchPapers
                                  .slice(0, MAX_PAPERS)
                                  .map((p, i) => (
                                    <a
                                      key={p.link + i}
                                      href={p.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block rounded-md px-3 py-2 hover:bg-foreground/5 transition-colors"
                                    >
                                      <DecryptedLine
                                        text={p.title}
                                        delay={i * 80}
                                        fixedDuration={500}
                                        bold
                                      />
                                      <div
                                        className={`${CONTENT_FONT_CLASS} text-xs mt-0.5 text-foreground/60`}
                                      >
                                        {p.authors}
                                        {p.venue ? ` — ${p.venue}` : ""}
                                        {p.year ? ` ${p.year}` : ""}
                                      </div>
                                    </a>
                                  ))}
                              </div>

                              <a
                                href="https://research.vizuara.ai/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 mt-2 text-xs underline underline-offset-4 decoration-dotted self-start"
                                style={{ color: item.color }}
                              >
                                Research Hub ↗
                              </a>
                            </div>
                          ) : index === 0 ? (
                            <div className={CONTENT_FONT_CLASS}>
                              <DecryptedMathLineByLine
                                key={`math-${decryptionTrigger}`}
                                lines={foundationLatexLines}
                                startTrigger={decryptionTrigger}
                              />
                            </div>
                          ) : (
                            <pre
                              className={`${CONTENT_FONT_CLASS} text-foreground/80 whitespace-pre-wrap`}
                            >
                              <code>
                                <DecryptedCodeLineByLine
                                  key={`code-${decryptionTrigger}`}
                                  text={attentionSnippet}
                                  startTrigger={decryptionTrigger}
                                />
                              </code>
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Periodic pulses (unchanged; optional visual depth) */}
                    <div className="pointer-events-none absolute inset-0">
                      {pulses
                        .filter((p) => p.cardIndex === index)
                        .map((p) => (
                          <span
                            key={p.id}
                            className="absolute inset-0 rounded-2xl"
                            style={{
                              boxShadow: `0 0 0 0 ${item.color}44`,
                              animation: "pulse-ring 1.5s ease-out forwards",
                            }}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default PhilosophySection;
