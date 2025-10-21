import {
  GraduationCap,
  Building2,
  Briefcase,
  Building,
  BookOpen,
  Users,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

const AIForAllAnimation = () => {
  const [revealedNodes, setRevealedNodes] = useState<number[]>([]);
  const [pulses, setPulses] = useState<
    { id: number; deltaX: number; deltaY: number; color: string }[]
  >([]);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const pulseIdRef = useRef(0);

  // Responsive container size
  const BASE = 800; // logical coordinate system
  const [size, setSize] = useState(600); // actual px size of container

  // Ratios relative to container size (tweak these if you want a different look)
  const CENTER_DIAM_RATIO = 0.2; // 120px on 600px base
  const DOT_DIAM_RATIO = 0.08;   // 48px on 600px base
  const ORBIT_RAD_RATIO = 0.07;  // 42px on 600px base

  useEffect(() => {
    const computeTargetSize = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      // Scales with viewport, bounded for sanity
      const target = Math.round(Math.max(360, Math.min(1120, vmin * 0.8)));
      setSize(target);
    };
    computeTargetSize();
    window.addEventListener("resize", computeTargetSize);
    return () => window.removeEventListener("resize", computeTargetSize);
  }, []);

  // Derived sizes
  const centerDiameterPx = size * CENTER_DIAM_RATIO;
  const nodeDotDiameterPx = size * DOT_DIAM_RATIO;

  // Convert visual sizes back into base units for line geometry
  const centerRadiusBase = (CENTER_DIAM_RATIO * BASE) / 2;
  const nodeRadiusBase = (DOT_DIAM_RATIO * BASE) / 2;

  // Brand colors
  const brandMagenta = "#ff00ff";
  const brandOrange = "#fbb03b";
  const brandBlue = "#29abe2";

  const nodes = [
    {
      id: 1,
      label: "Schools",
      delay: 0.4,
      icon: GraduationCap,
      color: brandOrange,
      gradient: "from-[#fbb03b] to-[#ff9500]",
    },
    {
      id: 2,
      label: "Universities",
      delay: 0.8,
      icon: Building2,
      color: brandBlue,
      gradient: "from-[#29abe2] to-[#0088cc]",
    },
    {
      id: 3,
      label: "Industry\nProfessionals",
      delay: 1.2,
      icon: Briefcase,
      color: brandMagenta,
      gradient: "from-[#ff00ff] to-[#cc00cc]",
    },
    {
      id: 4,
      label: "School Students",
      delay: 1.6,
      icon: Building,
      color: brandOrange,
      gradient: "from-[#fbb03b] to-[#ff9500]",
    },
    {
      id: 5,
      label: "Grads &\nUndergrads",
      delay: 2.0,
      icon: BookOpen,
      color: brandBlue,
      gradient: "from-[#29abe2] to-[#0088cc]",
    },
    {
      id: 6,
      label: "Businesses",
      delay: 2.4,
      icon: Users,
      color: brandMagenta,
      gradient: "from-[#ff00ff] to-[#cc00cc]",
    },
  ];

  const centerPos = { x: 400, y: 400 }; // base coords

  const getNodePosition = (nodeId: number) => {
    const centerX = 400;
    const centerY = 400;
    const radius = 280; // stays constant in base coords, scales with container via percentages

    const angleOffset = -90;
    const angleStep = 60;
    const angle = ((nodeId - 1) * angleStep + angleOffset) * (Math.PI / 180);

    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const getLinePoints = (nodeId: number) => {
    const nodePos = getNodePosition(nodeId);
    const dx = nodePos.x - centerPos.x;
    const dy = nodePos.y - centerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const ux = dx / distance;
    const uy = dy / distance;

    const startX = centerPos.x + ux * centerRadiusBase;
    const startY = centerPos.y + uy * centerRadiusBase;

    const endX = nodePos.x - ux * nodeRadiusBase;
    const endY = nodePos.y - uy * nodeRadiusBase;

    return { startX, startY, endX, endY };
  };

  const createPulse = (nodeId: number) => {
    const node = nodes.find((n) => n.id === nodeId);
    const nodePos = getNodePosition(nodeId);
    const deltaX = nodePos.x - centerPos.x;
    const deltaY = nodePos.y - centerPos.y;

    const newPulse = {
      id: pulseIdRef.current++,
      deltaX,
      deltaY,
      color: node?.color || brandMagenta,
    };

    setPulses((prev) => [...prev, newPulse]);

    setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== newPulse.id));
    }, 1200);
  };

  useEffect(() => {
    nodes.forEach((node) => {
      setTimeout(() => {
        setRevealedNodes((prev) => [...prev, node.id]);
        createPulse(node.id);
      }, node.delay * 1000);
    });

    const interval = setInterval(() => {
      nodes.forEach((node, index) => {
        setTimeout(() => {
          createPulse(node.id);
        }, index * 150);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleNodeHover = (nodeId: number, isEntering: boolean) => {
    if (isEntering) {
      setHoveredNode(nodeId);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createPulse(nodeId), i * 80);
      }
    } else {
      setHoveredNode(null);
    }
  };

  const strokeW = (hover: boolean) => {
    // Scales slightly with container size; keeps similar visual weight
    const base = hover ? 4 : 2;
    const scaled = Math.round(size * (hover ? 0.004 : 0.0025));
    return Math.max(base, scaled);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        ref={containerRef}
        style={
          {
            position: "relative",
            width: `${size}px`,
            height: `${size}px`,
            // CSS vars used by animations and sizes
            "--size": `${size}px`,
            "--center-d": `${centerDiameterPx}px`,
            "--dot-d": `${nodeDotDiameterPx}px`,
            "--orbit-r": `${size * ORBIT_RAD_RATIO}px`,
          } as React.CSSProperties
        }
      >
        {/* Ripples */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`ripple-${i}`}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              border: `2px solid ${brandMagenta}40`,
              borderRadius: "50%",
              animation: `ripple-expand 4s ease-out infinite ${i * 1}s`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Connection Lines */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
          }}
          viewBox={`0 0 ${BASE} ${BASE}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {revealedNodes.map((nodeId) => {
            const node = nodes.find((n) => n.id === nodeId)!;
            const { startX, startY, endX, endY } = getLinePoints(nodeId);
            const isHovered = hoveredNode === nodeId;
            return (
              <line
                key={`line-${nodeId}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isHovered ? node.color : `${node.color}60`}
                strokeWidth={strokeW(isHovered)}
                strokeLinecap="round"
                style={{
                  animation: "line-draw 0.6s ease-out forwards",
                  transition: "all 0.3s ease",
                  filter: isHovered
                    ? `drop-shadow(0 0 10px ${node.color})`
                    : "none",
                }}
              />
            );
          })}
        </svg>

        {/* Center Circle */}
        <div
          ref={centerRef}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "var(--center-d)",
            height: "var(--center-d)",
            background: "linear-gradient(135deg, #d946ef 0%, #3b82f6 100%)",
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            boxShadow: "0 8px 32px rgba(217, 70, 239, 0.5)",
            animation: "center-pulse 3s ease-in-out infinite",
          }}
        >
          <div
            style={{
              fontSize: `calc(var(--size) * 0.053)`, // ~32px at 600px
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "2px",
              lineHeight: 1,
            }}
          >
            AI
          </div>
          <div
            style={{
              fontSize: `calc(var(--size) * 0.018)`, // ~11px at 600px
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: "3px",
              marginTop: "2px",
            }}
          >
            FOR ALL
          </div>
        </div>

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = getNodePosition(node.id);
          const isRevealed = revealedNodes.includes(node.id);
          const isHovered = hoveredNode === node.id;
          const Icon = node.icon;

          return (
            <div
              key={node.id}
              onMouseEnter={() => handleNodeHover(node.id, true)}
              onMouseLeave={() => handleNodeHover(node.id, false)}
              style={{
                position: "absolute",
                left: `${(pos.x / BASE) * 100}%`,
                top: `${(pos.y / BASE) * 100}%`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                opacity: isRevealed ? 1 : 0,
                animation: isRevealed
                  ? "node-reveal 0.8s ease-out forwards"
                  : "none",
                cursor: "pointer",
                zIndex: 5,
              }}
              className="ai-node"
            >
              {/* Orbital particles on hover */}
              {isHovered && (
                <>
                  <div
                    className="orbital-particle orbital-1"
                    style={{ "--particle-color": node.color } as any}
                  />
                  <div
                    className="orbital-particle orbital-2"
                    style={{ "--particle-color": node.color } as any}
                  />
                  <div
                    className="orbital-particle orbital-3"
                    style={{ "--particle-color": node.color } as any}
                  />
                  <div
                    className="orbital-particle orbital-4"
                    style={{ "--particle-color": node.color } as any}
                  />
                </>
              )}

              {/* Glow rings on hover */}
              {isHovered && (
                <>
                  <div
                    className="ai-node-glow-ring ai-node-glow-ring-1"
                    style={{ borderColor: node.color }}
                  />
                  <div
                    className="ai-node-glow-ring ai-node-glow-ring-2"
                    style={{ borderColor: node.color }}
                  />
                  <div
                    className="ai-node-glow-ring ai-node-glow-ring-3"
                    style={{ borderColor: node.color }}
                  />
                </>
              )}

              <div
                className="ai-node-container"
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Icon background circle */}
                <div
                  className={`ai-node-dot bg-gradient-to-br ${node.gradient}`}
                  style={{
                    width: "var(--dot-d)",
                    height: "var(--dot-d)",
                    borderRadius: "50%",
                    boxShadow: isHovered
                      ? `0 0 30px ${node.color}, 0 8px 24px ${node.color}80`
                      : `0 4px 12px ${node.color}60`,
                    position: "relative",
                    transition: "all 0.4s ease",
                    transform: isHovered ? "scale(1.3)" : "scale(1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Inner glow */}
                  <div
                    className="ai-node-inner-glow"
                    style={{
                      background: `radial-gradient(circle, ${node.color}40 0%, transparent 70%)`,
                    }}
                  />

                  {/* Icon */}
                  <Icon
                    className="ai-node-icon"
                    style={{
                      color: "#fff",
                      width: `calc(var(--dot-d) * 0.5)`, // ~24px at 48px dot
                      height: `calc(var(--dot-d) * 0.5)`,
                    }}
                  />

                  {/* Sparkles on hover */}
                  {isHovered && (
                    <>
                      <div
                        className="sparkle sparkle-1"
                        style={{ "--sparkle-color": node.color } as any}
                      />
                      <div
                        className="sparkle sparkle-2"
                        style={{ "--sparkle-color": node.color } as any}
                      />
                      <div
                        className="sparkle sparkle-3"
                        style={{ "--sparkle-color": node.color } as any}
                      />
                      <div
                        className="sparkle sparkle-4"
                        style={{ "--sparkle-color": node.color } as any}
                      />
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: isHovered
                    ? `calc(var(--size) * 0.025)`
                    : `calc(var(--size) * 0.023)`, // ~14px baseline
                  color: isHovered ? node.color : "var(--foreground)",
                  fontWeight: isHovered ? 700 : 600,
                  whiteSpace: "pre-line",
                  textAlign: "center",
                  textShadow: isHovered
                    ? `0 2px 8px ${node.color}40`
                    : "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: isHovered
                    ? "translate(-50%, 4px) scale(1.05)"
                    : "translate(-50%, 4px) scale(1)",
                  marginTop: "0px",
                }}
              >
                {node.label}
              </div>
            </div>
          );
        })}

        {/* Connection Pulses */}
        {pulses.map((pulse) => {
          const dx = pulse.deltaX;
          const dy = pulse.deltaY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / distance;
          const uy = dy / distance;

          const startOffsetX = ux * centerRadiusBase;
          const startOffsetY = uy * centerRadiusBase;

          // Convert base units to actual px using container size
          const pxStartX = (startOffsetX / BASE) * size;
          const pxStartY = (startOffsetY / BASE) * size;
          const targetX = ((dx - startOffsetX) / BASE) * size;
          const targetY = ((dy - startOffsetY) / BASE) * size;

          return (
            <div
              key={pulse.id}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "8px",
                height: "8px",
                background: pulse.color,
                borderRadius: "50%",
                transform: `translate(calc(-50% + ${pxStartX}px), calc(-50% + ${pxStartY}px))`,
                boxShadow: `0 0 16px ${pulse.color}, 0 0 24px ${pulse.color}80`,
                animation: "pulse-to-node 1.2s ease-out forwards",
                // @ts-ignore custom props for keyframes
                "--target-x": `calc(-50% + ${targetX}px)`,
                "--target-y": `calc(-50% + ${targetY}px)`,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          );
        })}

        <style>{`
          @keyframes ripple-expand {
            0% {
              width: var(--center-d);
              height: var(--center-d);
              opacity: 0.6;
              border-width: 3px;
            }
            50% { opacity: 0.2; }
            100% {
              width: var(--size);
              height: var(--size);
              opacity: 0;
              border-width: 1px;
            }
          }

          @keyframes center-pulse {
            0%, 100% {
              box-shadow: 0 8px 32px rgba(217, 70, 239, 0.5);
            }
            50% {
              box-shadow: 0 8px 48px rgba(217, 70, 239, 0.8), 0 0 80px rgba(217, 70, 239, 0.4);
            }
          }

          @keyframes node-reveal {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }

          @keyframes pulse-to-node {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1);
            }
            10% { opacity: 1; }
            100% {
              opacity: 0;
              transform: translate(var(--target-x), var(--target-y)) scale(2.5);
            }
          }

          @keyframes line-draw {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes glow-ring {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(3);
              opacity: 0;
            }
          }

          @keyframes orbital {
            0%   { transform: rotate(0deg) translateX(var(--orbit-r)) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(var(--orbit-r)) rotate(-360deg); }
          }

          @keyframes sparkle {
            0%, 100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @keyframes icon-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .ai-node:hover .ai-node-icon {
            animation: icon-spin 2s linear infinite;
          }

          .ai-node-inner-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: center-pulse 2s ease-in-out infinite;
            pointer-events: none;
          }

          .ai-node-glow-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: var(--dot-d);
            height: var(--dot-d);
            border: 2px solid;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }

          .ai-node-glow-ring-1 { animation: glow-ring 1.5s ease-out infinite; }
          .ai-node-glow-ring-2 { animation: glow-ring 1.5s ease-out infinite 0.3s; }
          .ai-node-glow-ring-3 { animation: glow-ring 1.5s ease-out infinite 0.6s; }

          .orbital-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background: var(--particle-color);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--particle-color);
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
            background: var(--sparkle-color);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--sparkle-color);
          }

          .sparkle-1 { top: -10px; left: 50%; animation: sparkle 1.5s ease-in-out infinite; }
          .sparkle-2 { bottom: -10px; left: 50%; animation: sparkle 1.5s ease-in-out infinite 0.375s; }
          .sparkle-3 { top: 50%; left: -10px; animation: sparkle 1.5s ease-in-out infinite 0.75s; }
          .sparkle-4 { top: 50%; right: -10px; animation: sparkle 1.5s ease-in-out infinite 1.125s; }
        `}</style>
      </div>
    </div>
  );
};

export default AIForAllAnimation;