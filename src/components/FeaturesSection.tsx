import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Zap,
  Download,
  Layers,
  Eye,
  Code2,
  Settings,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Settings,
    title: "Intuitive Animation Controls",
    description: "Create complex animations with our easy-to-use timeline interface. Adjust timing, easing, and sequencing without coding."
  },
  {
    icon: Zap,
    title: "Smart Path Animation",
    description: "Automatically animate along SVG paths with customizable flow direction, speed, and particle effects for engaging visualizations."
  },
  {
    icon: Download,
    title: "Multiple Export Options",
    description: "Export your animated SVGs as code snippets, GIFs, or videos. Perfect for presentations, websites, or social media."
  },
  {
    icon: Layers,
    title: "Pre-built Templates",
    description: "Jump-start your animations with our library of templates. Customize them to match your branding and content needs."
  },
  {
    icon: Eye,
    title: "Real-time Preview",
    description: "Instantly see your animation changes reflected in the live preview panel. Iterate quickly and efficiently."
  },
  {
    icon: Code2,
    title: "Code Export (CSS/JS)",
    description: "Generate clean CSS or JavaScript (Web Animations API) code for seamless integration into web projects."
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-foreground">Powerful Features for </span>
            <span className="text-primary">SVG Animation</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your static diagrams into dynamic, engaging visual content with our intuitive tools and features.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card border-border hover:border-primary/30 transition-colors group">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Process Visualization */}
        <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">
              Visualize Complex Processes with Ease
            </h3>
            <p className="text-muted-foreground text-lg">
              Turn complicated workflows and diagrams into clear, compelling animations that guide viewers through each step.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Animate specific elements or entire diagrams</h4>
                  <p className="text-muted-foreground">Target individual components or orchestrate comprehensive diagram animations with precision control.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Control timing and sequence with our timeline editor</h4>
                  <p className="text-muted-foreground">Fine-tune every aspect of your animation timeline with our intuitive drag-and-drop interface.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Apply custom easing functions for natural movement</h4>
                  <p className="text-muted-foreground">Choose from preset easing curves or create custom ones for realistic, organic motion effects.</p>
                </div>
              </div>

              <Button variant="default" size="lg" className="mt-8">
                Try It Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="bg-background rounded-xl p-6 border border-border shadow-lg">
                <ProcessDiagram />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessDiagram() {
  return (
    <div className="w-full h-64">
      <svg viewBox="0 0 320 200" className="w-full h-full">
        {/* Process Flow */}
        <rect x="20" y="40" width="80" height="40" rx="20" fill="hsl(45 95% 58%)" className="animate-pulse">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
        </rect>
        <text x="60" y="63" textAnchor="middle" fontSize="12" fill="hsl(210 11% 15%)" fontWeight="bold">Upload SVG</text>

        <rect x="120" y="40" width="80" height="40" rx="20" fill="hsl(210 13% 25%)" stroke="hsl(45 95% 58%)" strokeWidth="2">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" begin="1s" repeatCount="indefinite" />
        </rect>
        <text x="160" y="63" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Add Animation</text>

        <rect x="220" y="40" width="80" height="40" rx="20" fill="hsl(210 13% 25%)" stroke="hsl(45 95% 58%)" strokeWidth="2">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" begin="2s" repeatCount="indefinite" />
        </rect>
        <text x="260" y="63" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">Export</text>

        {/* Animated arrows */}
        <path d="M100 60 L120 60" stroke="hsl(45 95% 58%)" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)">
          <animate attributeName="opacity" values="0;1;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
        </path>

        <path d="M200 60 L220 60" stroke="hsl(45 95% 58%)" strokeWidth="3" fill="none" markerEnd="url(#arrowhead)">
          <animate attributeName="opacity" values="0;1;0" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </path>

        {/* Timeline visualization */}
        <rect x="20" y="120" width="280" height="60" rx="8" fill="hsl(210 13% 20%)" stroke="hsl(210 13% 25%)" strokeWidth="1" />
        <text x="160" y="140" textAnchor="middle" fontSize="12" fill="hsl(210 5% 60%)" fontWeight="bold">Timeline Editor</text>

        {/* Timeline blocks */}
        <rect x="30" y="155" width="60" height="15" rx="7" fill="hsl(45 95% 58%)">
          <animate attributeName="width" values="0;60;60" dur="3s" repeatCount="indefinite" />
        </rect>

        <rect x="100" y="155" width="80" height="15" rx="7" fill="hsl(168 76% 42%)">
          <animate attributeName="width" values="0;80;80" dur="3s" begin="1s" repeatCount="indefinite" />
        </rect>

        <rect x="190" y="155" width="100" height="15" rx="7" fill="hsl(258 90% 66%)">
          <animate attributeName="width" values="0;100;100" dur="3s" begin="2s" repeatCount="indefinite" />
        </rect>

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(45 95% 58%)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}