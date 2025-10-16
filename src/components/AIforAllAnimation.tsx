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
  const [revealedNodes, setRevealedNodes] = useState([]);
  const [pulses, setPulses] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const containerRef = useRef(null);
  const centerRef = useRef(null);
  const pulseIdRef = useRef(0);

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
      label: "Businesses",
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
      label: "Students",
      delay: 2.4,
      icon: Users,
      color: brandMagenta,
      gradient: "from-[#ff00ff] to-[#cc00cc]",
    },
  ];

  const getNodePosition = (nodeId) => {
    const centerX = 400;
    const centerY = 400;
    const radius = 280;

    const angleOffset = -90;
    const angleStep = 60;
    const angle = ((nodeId - 1) * angleStep + angleOffset) * (Math.PI / 180);

    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const centerPos = { x: 400, y: 400 };
  const centerRadius = 60;
  const nodeRadius = 26;

  const getLinePoints = (nodeId) => {
    const nodePos = getNodePosition(nodeId);
    const dx = nodePos.x - centerPos.x;
    const dy = nodePos.y - centerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const ux = dx / distance;
    const uy = dy / distance;

    const startX = centerPos.x + ux * centerRadius;
    const startY = centerPos.y + uy * centerRadius;

    const endX = nodePos.x - ux * nodeRadius;
    const endY = nodePos.y - uy * nodeRadius;

    return { startX, startY, endX, endY };
  };

  const createPulse = (nodeId) => {
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

  const handleNodeHover = (nodeId, isEntering) => {
    if (isEntering) {
      setHoveredNode(nodeId);
      for (let i = 0; i < 8; i++) {
        setTimeout(() => createPulse(nodeId), i * 80);
      }
    } else {
      setHoveredNode(null);
    }
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
        style={{ position: "relative", width: "600px", height: "600px" }}
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
          viewBox="0 0 800 800"
          preserveAspectRatio="xMidYMid meet"
        >
          {revealedNodes.map((nodeId) => {
            const node = nodes.find((n) => n.id === nodeId);
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
                strokeWidth={isHovered ? "4" : "2"}
                strokeLinecap="round"
                style={{
                  animation: "line-draw 0.6s ease-out forwards",
                  transition: "all 0.3s ease",
                  filter: isHovered
                    ? `drop-shadow(0 0 8px ${node.color})`
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
            width: "120px",
            height: "120px",
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
              fontSize: "32px",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "2px",
            }}
          >
            AI
          </div>
          <div
            style={{
              fontSize: "11px",
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
                left: `${(pos.x / 800) * 100}%`,
                top: `${(pos.y / 800) * 100}%`,
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
                    width: "48px",
                    height: "48px",
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
                      width: "24px",
                      height: "24px",
                    }}
                  />

                  {/* Sparkle effects on hover */}
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
                  fontSize: isHovered ? "15px" : "14px",
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

          const startOffsetX = ux * centerRadius;
          const startOffsetY = uy * centerRadius;

          const targetX = ((dx - startOffsetX) / 800) * 600;
          const targetY = ((dy - startOffsetY) / 800) * 600;

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
                transform: `translate(calc(-50% + ${
                  (startOffsetX / 800) * 600
                }px), calc(-50% + ${(startOffsetY / 800) * 600}px))`,
                boxShadow: `0 0 16px ${pulse.color}, 0 0 24px ${pulse.color}80`,
                animation: "pulse-to-node 1.2s ease-out forwards",
                // @ts-ignore
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
              width: 120px;
              height: 120px;
              opacity: 0.6;
              border-width: 3px;
            }
            50% {
              opacity: 0.2;
            }
            100% {
              width: 600px;
              height: 600px;
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
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }

          @keyframes pulse-to-node {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1);
            }
            10% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: translate(var(--target-x), var(--target-y)) scale(2.5);
            }
          }

          @keyframes line-draw {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
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
            0% {
              transform: rotate(0deg) translateX(42px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(42px) rotate(-360deg);
            }
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
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
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
            width: 48px;
            height: 48px;
            border: 2px solid;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
          }

          .ai-node-glow-ring-1 {
            animation: glow-ring 1.5s ease-out infinite;
          }

          .ai-node-glow-ring-2 {
            animation: glow-ring 1.5s ease-out infinite 0.3s;
          }

          .ai-node-glow-ring-3 {
            animation: glow-ring 1.5s ease-out infinite 0.6s;
          }

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

          .orbital-1 {
            animation: orbital 3s linear infinite;
          }

          .orbital-2 {
            animation: orbital 3s linear infinite 0.75s;
          }

          .orbital-3 {
            animation: orbital 3s linear infinite 1.5s;
          }

          .orbital-4 {
            animation: orbital 3s linear infinite 2.25s;
          }

          .sparkle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--sparkle-color);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--sparkle-color);
          }

          .sparkle-1 {
            top: -10px;
            left: 50%;
            animation: sparkle 1.5s ease-in-out infinite;
          }

          .sparkle-2 {
            bottom: -10px;
            left: 50%;
            animation: sparkle 1.5s ease-in-out infinite 0.375s;
          }

          .sparkle-3 {
            top: 50%;
            left: -10px;
            animation: sparkle 1.5s ease-in-out infinite 0.75s;
          }

          .sparkle-4 {
            top: 50%;
            right: -10px;
            animation: sparkle 1.5s ease-in-out infinite 1.125s;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AIForAllAnimation;