import { Button } from "@/components/ui/button";
import { CheckCircle, Play } from "lucide-react";

export function HeroSection() {
  return (
    <section className="min-h-screen bg-hero-gradient flex items-center">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-foreground">Bring Your SVG</span>
                <br />
                <span className="text-foreground">Diagrams </span>
                <span className="text-primary">To Life</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Diagramotion makes it easy to animate flow into SVG diagrams and export 
                them seamlessly. Create stunning, animated SVGs with just a few clicks.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="premium" size="lg" className="text-lg px-8 py-6">
                Get Started Free
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Signal */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>No credit card required. Free 14-day trial.</span>
            </div>
          </div>

          {/* Right Content - Diagram */}
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl p-8 border-2 border-primary/30">
              <DiagramVisualization />
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-8">Trusted by innovative creators worldwide</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            {/* Company logos placeholder */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-12 h-12 bg-muted/30 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiagramVisualization() {
  return (
    <div className="relative w-full h-96 overflow-hidden">
      {/* Animated SVG Diagram */}
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Foundation Model */}
        <rect x="20" y="40" width="120" height="30" rx="15" fill="#e879f9" className="animate-pulse">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </rect>
        <text x="80" y="58" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Foundation Model</text>

        {/* Fine-tuned Model */}
        <rect x="20" y="90" width="120" height="30" rx="15" fill="#c084fc">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="0.5s" repeatCount="indefinite" />
        </rect>
        <text x="80" y="108" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Fine-tuned Model</text>

        {/* LLM */}
        <rect x="180" y="65" width="80" height="40" rx="20" fill="#374151" stroke="#6b7280" strokeWidth="2">
          <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <text x="220" y="88" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">LLM</text>

        {/* AI Agent */}
        <circle cx="220" cy="180" r="25" fill="#1f2937" stroke="#6b7280" strokeWidth="2">
          <animate attributeName="r" values="25;28;25" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="220" y="185" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">AI Agent</text>

        {/* Memory */}
        <rect x="300" y="40" width="80" height="30" rx="15" fill="#6b7280">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="1s" repeatCount="indefinite" />
        </rect>
        <text x="340" y="58" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Memory</text>

        {/* Short Term / Long Term */}
        <rect x="300" y="80" width="35" height="20" rx="10" fill="#67e8f9" />
        <text x="317" y="92" textAnchor="middle" fontSize="10" fill="black">Short Term</text>
        
        <rect x="345" y="80" width="35" height="20" rx="10" fill="#67e8f9" />
        <text x="362" y="92" textAnchor="middle" fontSize="10" fill="black">Long Term</text>

        {/* Tools */}
        <rect x="180" y="220" width="80" height="30" rx="15" fill="#6b7280">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" begin="0.3s" repeatCount="indefinite" />
        </rect>
        <text x="220" y="238" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Tools</text>

        {/* Right side elements */}
        <rect x="320" y="140" width="60" height="20" rx="10" fill="#86efac" />
        <text x="350" y="152" textAnchor="middle" fontSize="10" fill="black">Reflection</text>

        <rect x="320" y="170" width="60" height="20" rx="10" fill="#86efac" />
        <text x="350" y="182" textAnchor="middle" fontSize="10" fill="black">Chain of Thoughts</text>

        <rect x="320" y="200" width="60" height="20" rx="10" fill="#86efac" />
        <text x="350" y="212" textAnchor="middle" fontSize="10" fill="black">Decompose Subgoals</text>

        <rect x="320" y="230" width="60" height="20" rx="10" fill="#86efac" />
        <text x="350" y="242" textAnchor="middle" fontSize="10" fill="black">Self-Critique</text>

        {/* Animated connecting lines */}
        <path d="M140 55 L180 75" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite" />
        </path>

        <path d="M140 105 L180 85" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" begin="0.2s" repeatCount="indefinite" />
        </path>

        <path d="M220 105 L220 155" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" begin="0.4s" repeatCount="indefinite" />
        </path>

        <path d="M245 180 L320 150" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" begin="0.6s" repeatCount="indefinite" />
        </path>

        <path d="M220 205 L220 220" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="5,5">
          <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" begin="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}