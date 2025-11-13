import { Network, Scale, Sparkles, Eye, GraduationCap, Atom, ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const researchDomains = [
  {
    icon: Atom,
    title: "SciML",
    topics: ["PINN", "NeuralODE", "UDE", "Symbolic regression"],
    color: "#fbb03b",
  },
  {
    icon: Sparkles,
    title: "GenAI",
    topics: ["LLM", "Tiny stories", "SLM", "Attention heads"],
    color: "#ff00ff",
  },
  {
    icon: Eye,
    title: "Vision",
    topics: ["CNN", "LLM+CNN", "NanoVLM", "ViT", "VLM"],
    color: "#29abe2",
  },
  {
    icon: Scale,
    title: "Inference",
    topics: ["Cognition", "Bias", "Misinformation", "XAI"],
    color: "#fbb03b",
  },
  {
    icon: Network,
    title: "Reasoning",
    topics: ["RL", "RLHF", "Deepseek clone", "MOE"],
    color: "#ff00ff",
  },
];

const researchBootcamps = [
  {
    icon: Bot,
    title: "Reinforcement Learning Research Bootcamp",
    description: "Comprehensive program to write high-quality research papers in the field of Reinforcement Learning",
    link: "https://rlresearcherbootcamp.vizuara.ai/",
    color: "#44ff3b",
  },
  {
    icon: GraduationCap,
    title: "AI Highschool Researcher Bootcamp",
    description: "Research training program for aspiring high school AI researchers",
    link: "https://ai-highschool-research.vizuara.ai/",
    color: "#fbb03b",
  },
  {
    icon: Atom,
    title: "SciML Research Bootcamp",
    description: "Deep dive into Scientific Machine Learning and physics-informed neural networks",
    link: "https://flyvidesh.online/ml-bootcamp",
    color: "#29abe2",
  },
  {
    icon: Network,
    title: "ML-DL Research Bootcamp",
    description: "Comprehensive research training in Machine Learning and Deep Learning",
    link: "https://flyvidesh.online/ml-dl-bootcamp",
    color: "#ff00ff",
  },
  {
    icon: Sparkles,
    title: "GenAI Professional Bootcamp",
    description: "Advanced Generative AI research for professionals and researchers",
    link: "https://flyvidesh.online/gen-ai-professional-bootcamp",
    color: "#fbb03b",
  },
];

const ResearchSection = () => {
  const [visibleBootcamps, setVisibleBootcamps] = useState([]);
  const [hoveredBootcamp, setHoveredBootcamp] = useState(null);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  useEffect(() => {
    researchBootcamps.forEach((_, index) => {
      setTimeout(() => {
        setVisibleBootcamps((prev) => [...prev, index]);
      }, index * 200 + 400);
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes progress-line {
          from {
            height: 0%;
          }
          to {
            height: 100%;
          }
        }

        @keyframes dot-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes tag-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          60% {
            transform: scale(1.05) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: 0 0 5px var(--glow-color), 0 0 10px var(--glow-color);
          }
          50% {
            box-shadow: 0 0 10px var(--glow-color), 0 0 20px var(--glow-color), 0 0 30px var(--glow-color);
          }
        }

        @keyframes shimmer-slide {
          0% {
            background-position: -100% 0;
          }
          100% {
            background-position: 100% 0;
          }
        }

        @keyframes particle-float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }

        .animate-progress-line {
          animation: progress-line 2s ease-out forwards;
        }

        .animate-dot-pulse {
          animation: dot-pulse 2s ease-in-out infinite;
        }

        .animate-tag-pop {
          animation: tag-pop-in 0.4s ease-out forwards;
        }

        .topic-tag {
          position: relative;
          isolation: isolate;
        }
        
        /* Shimmer effect on hover - behind everything */
        .topic-tag-shimmer {
          position: absolute;
          inset: 0;
          border-radius: 0.5rem;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 60%
          );
          background-size: 200% 100%;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 1;
        }
        
        .topic-tag:hover .topic-tag-shimmer {
          opacity: 1;
          animation: shimmer-slide 0.8s ease-in-out;
        }

        /* Content always on top */
        .topic-tag-content {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
        }

        .topic-tag-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 5;
        }

        .topic-tag:hover .topic-tag-particle {
          animation: particle-float 1.5s ease-in-out infinite;
        }
      `}</style>

      <section className="relative flex flex-col items-center justify-center py-24 px-4 overflow-hidden bg-background">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-50/50 via-blue-50/30 to-background dark:from-purple-950/20 dark:via-blue-950/10 dark:to-background"></div>

        <div className="max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="opacity-0 animate-fade-in-up mb-16">
            <h2 className="text-5xl md:text-6xl font-semibold text-center mb-4 text-foreground">
              AI Research
            </h2>
            <p className="text-center text-foreground/60 mb-4 text-lg">
              Cutting-edge AI research across multiple domains
            </p>
            <p className="text-center text-foreground/70 text-base max-w-3xl mx-auto">
              We believe in pushing the boundaries of what's possible with AI. Our research spans from foundational
              scientific computing to cutting-edge generative models, always grounded in rigorous experimentation and
              real-world applications.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Research Domains Column */}
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col items-center mb-8">
                <h3 className="text-3xl font-semibold text-center mb-4 text-foreground">Research Domains</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-2 hover:scale-105 transition-all duration-200"
                  asChild
                >
                  <a href="https://research.vizuara.ai/" target="_blank" rel="noopener noreferrer">
                    View Research
                  </a>
                </Button>
              </div>
              <div className="space-y-8">
                {researchDomains.map((domain, index) => (
                  <div
                    key={index}
                    className="space-y-4 opacity-0 animate-slide-in-left"
                    style={{ animationDelay: `${400 + index * 150}ms` }}
                  >
                    <div className="flex items-center gap-3 group">
                      <div
                        className="p-2 rounded-lg transition-all duration-300 group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${domain.color}20, ${domain.color}10)`,
                        }}
                      >
                        <domain.icon
                          className="w-5 h-5 transition-colors duration-300"
                          style={{ color: domain.color }}
                        />
                      </div>
                      <h4 className="text-2xl font-semibold text-foreground">{domain.title}</h4>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {domain.topics.map((topic, topicIndex) => {
                        const isHovered = hoveredTopic === `${index}-${topicIndex}`;
                        return (
                          <div
                            key={topicIndex}
                            className="topic-tag px-4 py-2 rounded-lg bg-background/60 dark:bg-background/40 backdrop-blur-sm border-2 hover:shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300 cursor-pointer opacity-0 animate-tag-pop"
                            style={{
                              animationDelay: `${600 + index * 150 + topicIndex * 100}ms`,
                              borderColor: isHovered ? domain.color : `${domain.color}20`,
                              boxShadow: isHovered
                                ? `0 8px 24px ${domain.color}40, 0 0 40px ${domain.color}20`
                                : undefined,
                            }}
                            onMouseEnter={() => setHoveredTopic(`${index}-${topicIndex}`)}
                            onMouseLeave={() => setHoveredTopic(null)}
                          >
                            {/* Shimmer background effect */}
                            <div className="topic-tag-shimmer" />

                            {/* Floating particles */}
                            {isHovered && (
                              <>
                                <span
                                  className="topic-tag-particle"
                                  style={{
                                    top: '20%',
                                    left: '20%',
                                    background: domain.color,
                                    animationDelay: '0s',
                                  }}
                                />
                                <span
                                  className="topic-tag-particle"
                                  style={{
                                    top: '20%',
                                    right: '20%',
                                    background: domain.color,
                                    animationDelay: '0.3s',
                                  }}
                                />
                                <span
                                  className="topic-tag-particle"
                                  style={{
                                    bottom: '20%',
                                    left: '30%',
                                    background: domain.color,
                                    animationDelay: '0.6s',
                                  }}
                                />
                                <span
                                  className="topic-tag-particle"
                                  style={{
                                    bottom: '20%',
                                    right: '30%',
                                    background: domain.color,
                                    animationDelay: '0.9s',
                                  }}
                                />
                              </>
                            )}

                            {/* Content - always visible on top */}
                            <div className="topic-tag-content">
                              {/* Accent dot */}
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full mr-2 transition-all duration-300 flex-shrink-0"
                                style={{
                                  background: domain.color,
                                  opacity: isHovered ? 1 : 0.5,
                                  transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                                  boxShadow: isHovered ? `0 0 8px ${domain.color}` : 'none',
                                }}
                              />
                              <span
                                className="font-medium text-sm transition-colors duration-300"
                                style={{
                                  color: isHovered ? domain.color : 'inherit'
                                }}
                              >
                                {topic}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Research Bootcamps Column with Progress Line */}
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <h3 className="text-3xl font-semibold text-center mb-8 text-foreground">Research Bootcamps</h3>
              <div className="relative space-y-6">
                {/* Vertical Progress Line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border/30 dark:bg-border/20">
                  <div
                    className="w-full bg-gradient-to-b from-purple-500 via-blue-500 to-pink-500 animate-progress-line"
                    style={{ animationDelay: '400ms' }}
                  />
                </div>

                {researchBootcamps.map((bootcamp, index) => {
                  const isVisible = visibleBootcamps.includes(index);
                  const isHovered = hoveredBootcamp === index;

                  return (
                    <div
                      key={index}
                      className="relative pl-16 opacity-0"
                      style={{
                        animation: isVisible ? 'fade-in-up 0.6s ease-out forwards' : 'none',
                        animationDelay: `${index * 200 + 400}ms`,
                      }}
                      onMouseEnter={() => setHoveredBootcamp(index)}
                      onMouseLeave={() => setHoveredBootcamp(null)}
                    >
                      {/* Progress Dot */}
                      <div
                        className="absolute left-0 top-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: isVisible
                            ? `linear-gradient(135deg, ${bootcamp.color}40, ${bootcamp.color}20)`
                            : 'transparent',
                          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            background: bootcamp.color,
                            animation: isVisible ? 'dot-pulse 2s ease-in-out infinite' : 'none',
                            animationDelay: `${index * 0.2}s`,
                          }}
                        >
                          <bootcamp.icon className="w-3 h-3 text-white" />
                        </div>
                      </div>

                      {/* Card */}
                      <div
                        className="p-6 rounded-xl border border-border/50 dark:border-border/30 bg-background/60 dark:bg-background/40 backdrop-blur-md transition-all duration-300"
                        style={{
                          boxShadow: isHovered
                            ? `0 12px 40px -10px ${bootcamp.color}25, 0 0 0 1px ${bootcamp.color}15`
                            : undefined,
                          transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
                        }}
                      >
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-start gap-4">
                            <div
                              className="p-3 rounded-full shrink-0 transition-all duration-300"
                              style={{
                                background: `linear-gradient(135deg, ${bootcamp.color}20, ${bootcamp.color}10)`,
                                transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
                              }}
                            >
                              <bootcamp.icon
                                className="w-6 h-6"
                                style={{ color: bootcamp.color }}
                              />
                            </div>
                            <div className="flex-1">
                              <h4
                                className="text-lg font-semibold mb-2 transition-colors duration-300"
                                style={{
                                  color: isHovered ? bootcamp.color : 'var(--foreground)',
                                }}
                              >
                                {bootcamp.title}
                              </h4>
                              <p className="text-foreground/70 dark:text-foreground/60 text-sm leading-relaxed mb-3">
                                {bootcamp.description}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-2 transition-all duration-300 group/btn
             border-[var(--bootcamp-color)] text-[var(--bootcamp-color)]
             hover:bg-[var(--bootcamp-color)] hover:text-white"
                                style={{
                                  // pass bootcamp color dynamically via CSS variable
                                  ['--bootcamp-color' as any]: bootcamp.color,
                                }}
                                asChild
                              >
                                <a
                                  href={bootcamp.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2"
                                >
                                  <span>Learn More</span>
                                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ResearchSection;