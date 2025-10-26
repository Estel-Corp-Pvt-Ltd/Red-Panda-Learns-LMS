import React, { useEffect, useRef, useState } from "react";
import { Layers, Code2, Brain, LucideIcon } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Decryption config (shared by code + math)
const DECRYPTION_CONFIG = {
  SCRAMBLE_INTERVAL: 30, // how often scrambled glyphs update (ms)
  TIME_PER_LINE: 800, // each line finishes in exactly this time (ms)
  LINE_TRANSITION_DELAY: 150, // pause before the next line starts (ms)
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

// 7 lines each to align the total animation time
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

const researchRef = {
  title: "Attention Is All You Need",
  authors: "Vaswani et al.",
  venue: "NeurIPS 2017",
  link: "https://arxiv.org/abs/1706.03762",
};

// Unified decrypt line (used by code)
const DecryptedLine: React.FC<DecryptedLineProps> = ({
  text,
  delay = 0,
  fixedDuration,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  const initialDelayRef = useRef(delay);
  const onCompleteRef = useRef<() => void>(() => {});
  const didCompleteRef = useRef(false);

  // derive per-character speed to hit the fixed duration
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
    <div className="font-mono font-normal text-[13px] leading-[1.6] text-foreground/80 text-left">
      {displayedText || " "}
    </div>
  );
};

// Math line (decrypts monospace, then renders KaTeX inline to keep alignment)
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

  // derive per-character speed to hit the fixed duration
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
      // inline mode to keep the same line height/orientation as code
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

  // While decrypting, show monospace; when done, show KaTeX inline with same line box
  return isComplete ? (
    <div
      ref={renderedRef}
      className="katex-line font-mono font-normal text-[13px] leading-[1.6] text-left text-foreground"
    />
  ) : (
    <div className="font-mono font-normal text-[13px] leading-[1.6] text-foreground/80 text-left">
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
            key={i}
            text={line || " "}
            fixedDuration={DECRYPTION_CONFIG.TIME_PER_LINE}
            onComplete={() => handleLineComplete(i)}
          />
        ) : (
          <div key={i} className="h-[1.6em]" />
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
            key={i}
            latex={latex}
            fixedDuration={DECRYPTION_CONFIG.TIME_PER_LINE}
            onComplete={() => handleLineComplete(i)}
          />
        ) : (
          <div key={i} className="h-[1.6em]" />
        )
      )}
    </div>
  );
};

const PhilosophySection: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [decryptionTrigger, setDecryptionTrigger] = useState(0);

  const timeoutsRef = useRef<number[]>([]);
  const intervalsRef = useRef<number[]>([]);

  useEffect(() => {
    // Start both math and code at the same time
    const start = window.setTimeout(() => {
      setDecryptionTrigger(Date.now());
    }, 500);
    timeoutsRef.current.push(start);

    // Pulse visuals (non-layout affecting)
    philosophyItems.forEach((_, index) => {
      const t = window.setTimeout(() => createPulse(index), index * 250);
      timeoutsRef.current.push(t);
    });

    const intervalId = window.setInterval(() => {
      philosophyItems.forEach((_, index) => {
        const t = window.setTimeout(() => createPulse(index), index * 250);
        timeoutsRef.current.push(t);
      });
    }, 4000);
    intervalsRef.current.push(intervalId);

    return () => {
      intervalsRef.current.forEach((id) => window.clearInterval(id));
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      intervalsRef.current = [];
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (enter) {
      setHoveredCard(index);
      for (let i = 0; i < 3; i++) {
        const t = window.setTimeout(() => createPulse(index), i * 120);
        timeoutsRef.current.push(t);
      }
    } else {
      setHoveredCard(null);
    }
  };

  return (
    <>
      <style>{`
        /* keep KaTeX inline visually aligned with code and same weight */
        .katex { 
          font-size: 13px !important; 
          line-height: 1.6 !important; 
          font-weight: 400 !important;
        }
        .katex-display { margin: 0 !important; }
        /* Normalize KaTeX internals to same weight as code */
        .katex .mord, .katex .mbin, .katex .mrel, .katex .mop,
        .katex .mopen, .katex .mclose, .katex .minner,
        .katex .text, .katex .mathrm, .katex .mathit,
        .katex .mathbf, .katex .textbf, .katex .bold {
          font-weight: 400 !important;
        }
        /* clamp helper for equal description height */
        .clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <section className="relative py-24 px-6 overflow-hidden">
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
                  <div className="relative w-full p-8 bg-background/80 backdrop-blur-sm rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-all duration-300 group hover:shadow-xl flex flex-col h-full">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-6">
                        <div
                          className={`relative p-4 bg-gradient-to-br ${item.gradient} rounded-full transition-all duration-500`}
                          style={{
                            boxShadow: isHovered
                              ? `0 0 30px ${item.color}, 0 8px 24px ${item.color}80`
                              : `0 4px 12px ${item.color}60`,
                            transform: isHovered ? "scale(1.2)" : "scale(1)",
                          }}
                        >
                          <Icon className="w-8 h-8 text-white relative z-10" />
                        </div>
                      </div>

                      <h3
                        className="text-xl font-semibold mb-3"
                        style={{
                          color: isHovered ? item.color : "var(--foreground)",
                          textShadow: isHovered
                            ? `0 2px 8px ${item.color}40`
                            : "none",
                        }}
                      >
                        {item.title}
                      </h3>

                      {/* clamp to keep all three cards same height in header+desc */}
                      <p className="text-foreground/70 leading-relaxed font-light clamp-2 min-h-[48px]">
                        {item.description}
                      </p>
                    </div>

                    {/* Content area (fixed height, left aligned) */}
                    <div className="mt-6 w-full flex-1">
                      <div
                        className="relative rounded-xl border bg-foreground/[0.04] dark:bg-background/40 border-foreground/10 overflow-hidden h-[200px]"
                        style={{ boxShadow: `0 4px 18px ${item.color}22` }}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                          </div>
                        </div>

                        <div className="p-4 h-[calc(200px-40px)] text-left">
                          {index === 2 ? (
                            <div className="text-left">
                              <div className="text-sm leading-relaxed">
                                <div className="font-medium">
                                  {researchRef.title}
                                </div>
                                <div className="text-foreground/60 mt-1">
                                  {researchRef.authors} — {researchRef.venue}
                                </div>
                                <a
                                  href={researchRef.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 mt-2 underline underline-offset-4 decoration-dotted"
                                  style={{ color: item.color }}
                                >
                                  View paper ↗
                                </a>
                              </div>
                            </div>
                          ) : index === 0 ? (
                            <DecryptedMathLineByLine
                              lines={foundationLatexLines}
                              startTrigger={decryptionTrigger}
                            />
                          ) : (
                            <pre className="text-left font-mono font-normal text-[13px] leading-[1.6] text-foreground/80 whitespace-pre-wrap">
                              <code>
                                <DecryptedCodeLineByLine
                                  text={attentionSnippet}
                                  startTrigger={decryptionTrigger}
                                />
                              </code>
                            </pre>
                          )}
                        </div>
                      </div>
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
