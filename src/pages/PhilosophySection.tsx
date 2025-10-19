import React, { useEffect, useRef, useState } from "react";
import { Layers, Code2, Brain, type LucideIcon } from "lucide-react";

// Types
interface PhilosophyItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

interface DecryptedLineProps {
  text: string;
  delay?: number;
  onComplete?: () => void;
}

interface DecryptedCodeLineByLineProps {
  text: string;
  lineDelay?: number;
}

// Constants
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(){}[]<>?/\\|=-+";

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

const foundationSnippet = `Forward pass (dense layer):
z = W x + b
a = f(z)

Softmax + cross-entropy:
p_i = exp(z_i) / Σ_j exp(z_j)
L = - Σ_i y_i log p_i

Backprop to logits (softmax + CE):
∂L/∂z = p - y

Gradients for dense layer:
∂L/∂W = (∂L/∂z) xᵀ
∂L/∂b = ∂L/∂z
∂L/∂x = Wᵀ (∂L/∂z)`;

const attentionSnippet = `# Imports
import math
import torch
import torch.nn as nn

# Scaled dot-product attention
def sdpa(q, k, v, mask=None):
    d = q.size(-1)
    scores = (q @ k.transpose(-2, -1)) / math.sqrt(d)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    attn = torch.softmax(scores, dim=-1)
    return attn @ v, attn`;

const researchRef = {
  title: "Attention Is All You Need",
  authors: "Vaswani et al.",
  venue: "NeurIPS 2017",
  link: "https://arxiv.org/abs/1706.03762",
};

// Decrypted Line (typed, cleaned deps, onComplete once)
const DecryptedLine: React.FC<DecryptedLineProps> = ({
  text,
  delay = 0,
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  const initialDelayRef = useRef<number>(delay); // run once with initial delay
  const onCompleteRef = useRef<() => void>(() => {});
  const didCompleteRef = useRef<boolean>(false);

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

    // Done? render final text and call onComplete once
    if (currentIndex >= text.length) {
      setDisplayedText(text);
      if (!didCompleteRef.current) {
        didCompleteRef.current = true;
        onCompleteRef.current();
      }
      return;
    }

    const scrambleInterval = window.setInterval(() => {
      setDisplayedText(() => {
        let result = "";
        for (let i = 0; i < text.length; i++) {
          if (i < currentIndex) {
            result += text[i];
          } else if (text[i] === " ") {
            result += " ";
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }
        return result;
      });
    }, 30);

    const progressTimeout = window.setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 25);

    return () => {
      window.clearInterval(scrambleInterval);
      window.clearTimeout(progressTimeout);
    };
  }, [hasStarted, currentIndex]); // no `text`, no `CHARS`

  return <>{displayedText}</>;
};

// Decrypted Code (line-by-line, start at 1, no extra effect)
const DecryptedCodeLineByLine: React.FC<DecryptedCodeLineByLineProps> = ({
  text,
  lineDelay = 200,
}) => {
  // Reviewer: "Why not set to 1 at declaration?" → Done
  const [visibleLines, setVisibleLines] = useState<number>(1);
  const lines = text.split("\n");

  const handleLineComplete = (lineIndex: number) => {
    if (lineIndex < lines.length - 1) {
      window.setTimeout(() => {
        setVisibleLines(lineIndex + 2);
      }, lineDelay);
    }
  };

  return (
    <>
      {lines.map((line, index) => (
        <div key={index}>
          {index < visibleLines ? (
            <DecryptedLine
              text={line || " "}
              delay={0}
              onComplete={() => handleLineComplete(index)}
            />
          ) : (
            <span style={{ opacity: 0 }}>{line || " "}</span>
          )}
        </div>
      ))}
    </>
  );
};

const PhilosophySection: React.FC = () => {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pulses, setPulses] = useState<
    Array<{ id: number; cardIndex: number }>
  >([]);
  const [startCodeDecryption, setStartCodeDecryption] = useState<boolean[]>(
    Array.from({ length: philosophyItems.length }, () => false)
  );

  const timeoutsRef = useRef<number[]>([]);
  const intervalsRef = useRef<number[]>([]);

  useEffect(() => {
    // Staggered reveal + start code decryption for first two cards
    philosophyItems.forEach((_, index) => {
      const t = window.setTimeout(() => {
        setRevealedCards((prev) => [...prev, index]);
        if (index < 2) {
          const t2 = window.setTimeout(() => {
            setStartCodeDecryption((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
          }, 400);
          timeoutsRef.current.push(t2);
        }
      }, index * 200);
      timeoutsRef.current.push(t);
    });

    // Periodic pulses across cards
    const intervalId = window.setInterval(() => {
      philosophyItems.forEach((_, index) => {
        const t = window.setTimeout(() => {
          createPulse(index);
        }, index * 300);
        timeoutsRef.current.push(t);
      });
    }, 4000);
    intervalsRef.current.push(intervalId);

    return () => {
      // Cleanup
      intervalsRef.current.forEach((id) => window.clearInterval(id));
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      intervalsRef.current = [];
      timeoutsRef.current = [];
    };
  }, []);

  const createPulse = (cardIndex: number) => {
    const pulseId = Date.now() + cardIndex + Math.floor(Math.random() * 1000);
    setPulses((prev) => [...prev, { id: pulseId, cardIndex }]);

    const t = window.setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== pulseId));
    }, 1500);
    timeoutsRef.current.push(t);
  };

  const handleCardHover = (index: number, isEntering: boolean) => {
    if (isEntering) {
      setHoveredCard(index);
      for (let i = 0; i < 3; i++) {
        const t = window.setTimeout(() => createPulse(index), i * 150);
        timeoutsRef.current.push(t);
      }
    } else {
      setHoveredCard(null);
    }
  };

  return (
    <>
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(0.95); }
          66% { transform: translate(30px, -30px) scale(1.05); }
        }
        @keyframes blob-float-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, 40px) scale(1.08); }
          66% { transform: translate(-30px, -20px) scale(0.92); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ripple-expand {
          0% { width: 60px; height: 60px; opacity: 0.8; }
          100% { width: 200px; height: 200px; opacity: 0; }
        }
        @keyframes icon-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes glow-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        @keyframes orbital {
          0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-blob-float-1 { animation: blob-float-1 20s ease-in-out infinite; }
        .animate-blob-float-2 { animation: blob-float-2 18s ease-in-out infinite; }
        .animate-blob-float-3 { animation: blob-float-3 22s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        .philosophy-card:hover .card-icon { animation: icon-spin 2s linear infinite; }
        .glow-ring { position: absolute; top: 50%; left: 50%; border-radius: 50%; border: 2px solid; pointer-events: none; }
        .glow-ring-1 { animation: glow-ring 1.5s ease-out infinite; }
        .glow-ring-2 { animation: glow-ring 1.5s ease-out infinite 0.3s; }
        .glow-ring-3 { animation: glow-ring 1.5s ease-out infinite 0.6s; }
        .orbital-particle { position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; border-radius: 50%; margin-left: -3px; margin-top: -3px; }
        .orbital-1 { animation: orbital 3s linear infinite; }
        .orbital-2 { animation: orbital 3s linear infinite 0.75s; }
        .orbital-3 { animation: orbital 3s linear infinite 1.5s; }
        .orbital-4 { animation: orbital 3s linear infinite 2.25s; }
        .sparkle { position: absolute; width: 4px; height: 4px; border-radius: 50%; }
        .sparkle-1 { top: -15px; left: 50%; animation: sparkle 1.5s ease-in-out infinite; }
        .sparkle-2 { bottom: -15px; left: 50%; animation: sparkle 1.5s ease-in-out infinite 0.375s; }
        .sparkle-3 { top: 50%; left: -15px; animation: sparkle 1.5s ease-in-out infinite 0.75s; }
        .sparkle-4 { top: 50%; right: -15px; animation: sparkle 1.5s ease-in-out infinite 1.125s; }
      `}</style>

      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/30 to-pink-50/20 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/10"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-blob-float-1"></div>
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-blob-float-2"></div>
          <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] bg-pink-400/15 dark:bg-pink-600/10 rounded-full blur-3xl animate-blob-float-3"></div>
        </div>

        <div className="container relative mx-auto max-w-6xl">
          <div
            className="text-center mb-16 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
          >
            <h2 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground mb-4">
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
                  className="relative philosophy-card opacity-0 animate-fade-in-up h-full flex"
                  style={{ animationDelay: `${200 + index * 200}ms` }}
                  onMouseEnter={() => handleCardHover(index, true)}
                  onMouseLeave={() => handleCardHover(index, false)}
                >
                  {pulses
                    .filter((p) => p.cardIndex === index)
                    .map((pulse) => (
                      <div
                        key={pulse.id}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                        style={{
                          border: `2px solid ${item.color}`,
                          animation: "ripple-expand 1.5s ease-out",
                          zIndex: 0,
                        }}
                      />
                    ))}

                  <div className="relative w-full p-8 bg-background/80 backdrop-blur-sm rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-all duration-300 group hover:shadow-xl flex flex-col">
                    <div className="flex flex-col items-center text-center h-full">
                      <div className="relative mb-6">
                        {isHovered && (
                          <>
                            <div
                              className="orbital-particle orbital-1"
                              style={{
                                background: item.color,
                                boxShadow: `0 0 10px ${item.color}`,
                              }}
                            />
                            <div
                              className="orbital-particle orbital-2"
                              style={{
                                background: item.color,
                                boxShadow: `0 0 10px ${item.color}`,
                              }}
                            />
                            <div
                              className="orbital-particle orbital-3"
                              style={{
                                background: item.color,
                                boxShadow: `0 0 10px ${item.color}`,
                              }}
                            />
                            <div
                              className="orbital-particle orbital-4"
                              style={{
                                background: item.color,
                                boxShadow: `0 0 10px ${item.color}`,
                              }}
                            />
                          </>
                        )}

                        {isHovered && (
                          <>
                            <div
                              className="glow-ring glow-ring-1"
                              style={{
                                borderColor: item.color,
                                width: "60px",
                                height: "60px",
                              }}
                            />
                            <div
                              className="glow-ring glow-ring-2"
                              style={{
                                borderColor: item.color,
                                width: "60px",
                                height: "60px",
                              }}
                            />
                            <div
                              className="glow-ring glow-ring-3"
                              style={{
                                borderColor: item.color,
                                width: "60px",
                                height: "60px",
                              }}
                            />
                          </>
                        )}

                        <div
                          className={`relative p-4 bg-gradient-to-br ${item.gradient} rounded-full transition-all duration-500`}
                          style={{
                            boxShadow: isHovered
                              ? `0 0 30px ${item.color}, 0 8px 24px ${item.color}80`
                              : `0 4px 12px ${item.color}60`,
                            transform: isHovered ? "scale(1.2)" : "scale(1)",
                          }}
                        >
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full pointer-events-none"
                            style={{
                              background: `radial-gradient(circle, ${item.color}40 0%, transparent 70%)`,
                            }}
                          />
                          <Icon className="card-icon w-8 h-8 text-white relative z-10" />
                          {isHovered && (
                            <>
                              <div
                                className="sparkle sparkle-1"
                                style={{
                                  background: item.color,
                                  boxShadow: `0 0 8px ${item.color}`,
                                }}
                              />
                              <div
                                className="sparkle sparkle-2"
                                style={{
                                  background: item.color,
                                  boxShadow: `0 0 8px ${item.color}`,
                                }}
                              />
                              <div
                                className="sparkle sparkle-3"
                                style={{
                                  background: item.color,
                                  boxShadow: `0 0 8px ${item.color}`,
                                }}
                              />
                              <div
                                className="sparkle sparkle-4"
                                style={{
                                  background: item.color,
                                  boxShadow: `0 0 8px ${item.color}`,
                                }}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <h3
                        className="text-xl font-semibold mb-4 transition-all duration-300"
                        style={{
                          color: isHovered ? item.color : "var(--foreground)",
                          textShadow: isHovered
                            ? `0 2px 8px ${item.color}40`
                            : "none",
                        }}
                      >
                        {item.title}
                      </h3>

                      <p className="text-foreground/70 leading-relaxed font-light">
                        {item.description}
                      </p>

                      <div className="mt-6 w-full">
                        <div
                          className="relative rounded-xl border bg-foreground/[0.04] dark:bg-background/40 border-foreground/10 overflow-hidden"
                          style={{ boxShadow: `0 4px 18px ${item.color}22` }}
                        >
                          <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: "#ff5f56" }}
                              />
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: "#ffbd2e" }}
                              />
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ background: "#27c93f" }}
                              />
                            </div>
                          </div>

                          <div className="p-4">
                            {index === 2 ? (
                              <div className="text-left">
                                <div className="text-sm leading-relaxed">
                                  <div className="font-medium">
                                    {researchRef.title}
                                  </div>
                                  <div className="text-foreground/60">
                                    {researchRef.authors} — {researchRef.venue}
                                  </div>
                                  <a
                                    href={researchRef.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 mt-2 text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-dotted"
                                    style={{ color: item.color }}
                                  >
                                    View paper ↗
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <pre className="text-left text-[13px] leading-relaxed font-mono text-foreground/80 whitespace-pre-wrap overflow-visible">
                                <code>
                                  {startCodeDecryption[index] ? (
                                    <DecryptedCodeLineByLine
                                      text={
                                        index === 0
                                          ? foundationSnippet
                                          : attentionSnippet
                                      }
                                      lineDelay={150}
                                    />
                                  ) : null}
                                </code>
                              </pre>
                            )}
                          </div>
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
