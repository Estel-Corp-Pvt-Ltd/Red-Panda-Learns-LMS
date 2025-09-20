import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const HeroSection = () => {
  return (
    <section className="hero-section min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 pt-20 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6">
            Vizuara{" "}
            <span className="gradient-text">AI Labs</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Complete AI solutions for{" "}
            <span className="text-brand-orange font-semibold">industry</span>,{" "}
            <span className="text-brand-fuchsia font-semibold">research</span>, and{" "}
            <span className="text-brand-blue font-semibold">education</span>.
          </p>
          
          {/* University Logos */}
         <div className="flex justify-center items-center gap-8 mb-12 flex-wrap">
  <div className="card rounded-xl p-4">
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/MIT_logo.svg/200px-MIT_logo.svg.png" // replace with your image path
      alt="MIT Logo"
      className="w-12 h-12 rounded-half object-contain"
    />
  </div>
  <div className="card rounded-xl p-4">
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Purdue_Boilermakers_logo.svg/200px-Purdue_Boilermakers_logo.svg.png" // replace with your image path
      alt="Purdue Logo"
      className="w-12 h-12 rounded-half object-contain"
    />
  </div>
  <div className="card rounded-xl p-4">
    <img
      src="https://www.vizuara.com/lovable-uploads/f153bda0-558e-4e6e-b9ac-869f97bbdc33.png" // replace with your image path
      alt="IIT Madras Logo"
      className="w-12 h-12 rounded-half object-contain"
    />
  </div>
</div>

          
          <p className="text-muted-foreground mb-16">
            By MIT, Purdue & IIT Madras AI PhDs
          </p>
          
          {/* Mission Statement */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Our mission: <span className="gradient-text">Make AI accessible for all</span>
            </h2>
          </div>
          
          {/* Bootcamp Card */}
          <div className="max-w-2xl mx-auto p-8 mb-12 card rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-fuchsia to-brand-blue flex items-center justify-center flex-shrink-0 mt-1">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold mb-2">Transformers for Vision Bootcamp</h3>
                <p className="text-muted-foreground mb-4">
                  An introduction to Transformers, its computer vision applications, and multi-modal LLMs. Live bootcamp starting September 27 - Comprehensive 14-week AI training program
                </p>
                <Button className="bg-gradient-to-r from-brand-fuchsia to-brand-blue text-white border-0 hover:opacity-90">
                  Join Bootcamp
                </Button>
              </div>
            </div>
          </div>
          
          {/* Get Started Button */}
          <Button 
            size="lg"
            className="bg-gradient-to-r from-brand-fuchsia via-brand-orange to-brand-blue text-white px-8 py-6 text-lg font-semibold border-0 hover:opacity-90"
          >
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
};