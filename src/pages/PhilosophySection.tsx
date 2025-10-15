import { Layers, Code2, Brain } from "lucide-react";
import { useState, useEffect } from "react";

const philosophyItems = [
  {
    icon: Layers,
    title: "Foundations",
    description: "Deep foundational knowledge wins over fluff and shortcuts. Timeless knowledge sustains over latest fad.",
    color: "#fbb03b",
    gradient: "from-[#fbb03b] to-[#ff9500]",
  },
  {
    icon: Code2,
    title: "Practicals",
    description: "Hands-on experience and building from scratch is the best way to master AI concepts and models.",
    color: "#29abe2",
    gradient: "from-[#29abe2] to-[#0088cc]",
  },
  {
    icon: Brain,
    title: "Research",
    description: "We are trying to push the boundaries of AI through research.",
    color: "#ff00ff",
    gradient: "from-[#ff00ff] to-[#cc00cc]",
  },
];

const PhilosophySection = () => {
  const [revealedCards, setRevealedCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [pulses, setPulses] = useState([]);

  useEffect(() => {
    philosophyItems.forEach((_, index) => {
      setTimeout(() => {
        setRevealedCards((prev) => [...prev, index]);
      }, index * 200);
    });

    // Continuous pulse effect
    const interval = setInterval(() => {
      philosophyItems.forEach((_, index) => {
        setTimeout(() => {
          createPulse(index);
        }, index * 300);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const createPulse = (cardIndex) => {
    const pulseId = Date.now() + cardIndex;
    setPulses((prev) => [...prev, { id: pulseId, cardIndex }]);
    
    setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== pulseId));
    }, 1500);
  };

  const handleCardHover = (index, isEntering) => {
    if (isEntering) {
      setHoveredCard(index);
      for (let i = 0; i < 3; i++) {
        setTimeout(() => createPulse(index), i * 150);
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
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ripple-expand {
          0% {
            width: 60px;
            height: 60px;
            opacity: 0.8;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }

        @keyframes icon-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes glow-ring {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes orbital {
          0% {
            transform: rotate(0deg) translateX(50px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(50px) rotate(-360deg);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-wave {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
        
        .animate-blob-float-1 {
          animation: blob-float-1 20s ease-in-out infinite;
        }
        
        .animate-blob-float-2 {
          animation: blob-float-2 18s ease-in-out infinite;
        }
        
        .animate-blob-float-3 {
          animation: blob-float-3 22s ease-in-out infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .philosophy-card:hover .card-icon {
          animation: icon-spin 2s linear infinite;
        }

        .glow-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          border: 2px solid;
          pointer-events: none;
        }

        .glow-ring-1 {
          animation: glow-ring 1.5s ease-out infinite;
        }

        .glow-ring-2 {
          animation: glow-ring 1.5s ease-out infinite 0.3s;
        }

        .glow-ring-3 {
          animation: glow-ring 1.5s ease-out infinite 0.6s;
        }

        .orbital-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-left: -3px;
          margin-top: -3px;
        }

        .orbital-1 { animation: orbital 3s linear infinite; }
        .orbital-2 { animation: orbital 3s linear infinite 0.75s; }
        .orbital-3 { animation: orbital 3s linear infinite 1.5s; }
        .orbital-4 { animation: orbital 3s linear infinite 2.25s; }

        .sparkle {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        .sparkle-1 {
          top: -15px;
          left: 50%;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .sparkle-2 {
          bottom: -15px;
          left: 50%;
          animation: sparkle 1.5s ease-in-out infinite 0.375s;
        }

        .sparkle-3 {
          top: 50%;
          left: -15px;
          animation: sparkle 1.5s ease-in-out infinite 0.75s;
        }

        .sparkle-4 {
          top: 50%;
          right: -15px;
          animation: sparkle 1.5s ease-in-out infinite 1.125s;
        }

        .pulse-wave {
          animation: pulse-wave 1.5s ease-out;
        }
      `}</style>
      
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Gradient Background with floating blobs */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/30 to-pink-50/20"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl animate-blob-float-1"></div>
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-3xl animate-blob-float-2"></div>
          <div className="absolute bottom-0 left-1/3 w-[550px] h-[550px] bg-pink-400/15 rounded-full blur-3xl animate-blob-float-3"></div>
        </div>

        <div className="container relative mx-auto max-w-6xl">
          <div 
            className="text-center mb-16 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            <h2 className="text-5xl md:text-6xl font-semibold leading-tight tracking-tight text-foreground mb-4">
              Our Philosophy
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto font-light">
              At Vizuara, internally we call this the F-P-R approach
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {philosophyItems.map((item, index) => {
              const isRevealed = revealedCards.includes(index);
              const isHovered = hoveredCard === index;
              const Icon = item.icon;

              return (
                <div
                  key={index}
                  className="relative philosophy-card opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${200 + index * 200}ms` }}
                  onMouseEnter={() => handleCardHover(index, true)}
                  onMouseLeave={() => handleCardHover(index, false)}
                >
                  {/* Ripple effect */}
                  {pulses
                    .filter((p) => p.cardIndex === index)
                    .map((pulse) => (
                      <div
                        key={pulse.id}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                        style={{
                          border: `2px solid ${item.color}`,
                          animation: 'ripple-expand 1.5s ease-out',
                          zIndex: 0,
                        }}
                      />
                    ))}

                  <div className="relative p-8 bg-background/80 backdrop-blur-sm rounded-2xl border border-foreground/10 hover:border-foreground/20 transition-all duration-300 group hover:shadow-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-6">
                        {/* Orbital particles on hover */}
                        {isHovered && (
                          <>
                            <div
                              className="orbital-particle orbital-1"
                              style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                            />
                            <div
                              className="orbital-particle orbital-2"
                              style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                            />
                            <div
                              className="orbital-particle orbital-3"
                              style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                            />
                            <div
                              className="orbital-particle orbital-4"
                              style={{ background: item.color, boxShadow: `0 0 10px ${item.color}` }}
                            />
                          </>
                        )}

                        {/* Glow rings on hover */}
                        {isHovered && (
                          <>
                            <div className="glow-ring glow-ring-1" style={{ borderColor: item.color, width: '60px', height: '60px' }} />
                            <div className="glow-ring glow-ring-2" style={{ borderColor: item.color, width: '60px', height: '60px' }} />
                            <div className="glow-ring glow-ring-3" style={{ borderColor: item.color, width: '60px', height: '60px' }} />
                          </>
                        )}

                        <div
                          className={`relative p-4 bg-gradient-to-br ${item.gradient} rounded-full transition-all duration-500`}
                          style={{
                            boxShadow: isHovered
                              ? `0 0 30px ${item.color}, 0 8px 24px ${item.color}80`
                              : `0 4px 12px ${item.color}60`,
                            transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                          }}
                        >
                          {/* Inner glow */}
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full pointer-events-none"
                            style={{
                              background: `radial-gradient(circle, ${item.color}40 0%, transparent 70%)`,
                            }}
                          />

                          <Icon className="card-icon w-8 h-8 text-white relative z-10" />

                          {/* Sparkles on hover */}
                          {isHovered && (
                            <>
                              <div className="sparkle sparkle-1" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                              <div className="sparkle sparkle-2" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                              <div className="sparkle sparkle-3" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                              <div className="sparkle sparkle-4" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                            </>
                          )}
                        </div>
                      </div>

                      <h3 
                        className="text-xl font-semibold mb-4 transition-all duration-300"
                        style={{
                          color: isHovered ? item.color : 'var(--foreground)',
                          textShadow: isHovered ? `0 2px 8px ${item.color}40` : 'none',
                        }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-foreground/70 leading-relaxed font-light">
                        {item.description}
                      </p>
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