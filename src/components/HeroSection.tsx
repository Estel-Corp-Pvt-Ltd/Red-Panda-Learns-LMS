import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Copy, Mail } from "lucide-react";
import AIForAllAnimation from "./AIforAllAnimation.tsx";
import { useEffect, useState, createContext, useContext } from "react";

interface DiagonalContextType {
  angleRad: number;
  angleDeg: number;
}

export const DiagonalContext = createContext<DiagonalContextType>({
  angleRad: 0,
  angleDeg: 0,
});

export const useDiagonal = () => useContext(DiagonalContext);

export const HeroSection = () => {
  const { toast } = useToast();
  const email = "hello@RedPanda Learns.com";

  const [geometry, setGeometry] = useState({
    offsetPx: 0,
    liftPx: 0, // NEW: Variable to control vertical shift
    angleRad: 0,
    angleDeg: 0,
  });

  useEffect(() => {
    const calculateGeometry = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // ---------------------------------------------------------
      // 1. CONTROL THE STEEPNESS (Height difference between Left and Right)
      // Increase 0.35 to 0.5 or 0.6 to make the right side higher
      const calculatedOffset = h * 0.5;
      const offsetPx = Math.max(150, Math.min(600, calculatedOffset));

      // ---------------------------------------------------------
      // 2. CONTROL THE LIFT (How high the Left side starts)
      // Increase 0.1 to 0.2 to lift the whole shape higher up
      const liftPx = h * 0.19;

      // Calculate Angle (Only offset affects angle, lift does not)
      const angleRad = Math.atan2(offsetPx, w);
      const angleDeg = angleRad * (180 / Math.PI);

      setGeometry({ offsetPx, liftPx, angleRad, angleDeg });
    };

    calculateGeometry();
    window.addEventListener("resize", calculateGeometry);
    return () => window.removeEventListener("resize", calculateGeometry);
  }, []);

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied!",
      description: "The email address has been copied to your clipboard.",
    });
  };

  return (
    <DiagonalContext.Provider value={{ angleRad: geometry.angleRad, angleDeg: geometry.angleDeg }}>
      <section className="relative min-h-screen overflow-hidden bg-background">
        {/* Gradient Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            // UPDATED CLIP PATH:
            // Point 4 (Bottom-Left): 100% - lift
            // Point 3 (Bottom-Right): 100% - offset - lift
            clipPath: `polygon(
              0 0, 
              100% 0, 
              100% calc(100% - ${geometry.offsetPx}px - ${geometry.liftPx}px), 
              0 calc(100% - ${geometry.liftPx}px)
            )`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 via-purple-400/30 to-blue-400/20" />
          {/* Blobs... */}
          <div className="absolute top-0 left-0 w-[40vw] h-[40vw] max-w-[500px] bg-pink-400/40 rounded-full blur-3xl animate-blob-float-1" />
          <div className="absolute top-1/4 right-0 w-[45vw] h-[45vw] max-w-[600px] bg-purple-400/40 rounded-full blur-3xl animate-blob-float-2" />
          <div className="absolute bottom-0 left-1/4 w-[40vw] h-[40vw] max-w-[550px] bg-blue-400/30 rounded-full blur-3xl animate-blob-float-3" />
        </div>

        <div className="container relative mx-auto px-6 py-10 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[85vh]">
            {/* Left Content */}
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.1] tracking-tight text-foreground">
                <span className="block">Making AI</span>
                <span className="block">accessible</span>
                <span className="block">for all</span>
              </h1>
              <p className="text-lg text-foreground/70 max-w-xl leading-relaxed font-light">
                World-class AI education for learners at every level, research programs driving
                innovation, and business solutions that make a difference.
              </p>
              <div className="pt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="lg"
                      className="bg-foreground hover:bg-foreground/90 text-background font-medium px-6 py-5 rounded-full transition-all duration-200"
                    >
                      <Mail className="h-5 w-5 mr-2" />
                      Contact us
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-popover">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Contact Us
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Send us an email and we'll get back to you shortly.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                          {email}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyEmail}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Right Animation */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <AIForAllAnimation />
            </div>
          </div>
        </div>
      </section>
    </DiagonalContext.Provider>
  );
};

export default HeroSection;
