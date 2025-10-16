import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Copy, Mail } from "lucide-react";
import AIForAllAnimation from "./AIforAllAnimation.tsx";

export const HeroSection = () => {
  const { toast } = useToast();
  const email = "hello@vizuara.com";

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied!",
      description: "The email address has been copied to your clipboard.",
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Gradient Background - Blurred color blobs with animation */}
      <div className="absolute inset-0 [clip-path:polygon(0_0,100%_0,100%_calc(100%-40vw),0_100%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400/30 via-purple-400/30 to-blue-400/20"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-400/40 rounded-full blur-3xl animate-blob-float-1"></div>
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-purple-400/40 rounded-full blur-3xl animate-blob-float-2"></div>
        <div className="absolute bottom-0 left-1/4 w-[550px] h-[550px] bg-blue-400/30 rounded-full blur-3xl animate-blob-float-3"></div>
        <div className="absolute top-1/2 right-1/4 w-[450px] h-[450px] bg-yellow-400/30 rounded-full blur-3xl animate-blob-float-4"></div>
      </div>

      <div className="container relative mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[85vh]">
          {/* Left side - Content */}
          <div className="space-y-6 z-10">
            {/* Stripe-style heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.1] tracking-tight text-foreground">
              <span className="block">Making AI</span>
              <span className="block">accessible</span>
              <span className="block">for all</span>
            </h1>

            <p className="text-lg text-foreground/70 max-w-xl leading-relaxed font-light">
              World-class AI education for learners at every level, research
              programs driving innovation, and business solutions that make a
              difference. Everything in one platform, built to make AI
              accessible without the complexity.
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

          {/* Right side - AI For All Animation */}
          <div className="relative z-10 flex items-center justify-center lg:justify-end">
            <AIForAllAnimation />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;