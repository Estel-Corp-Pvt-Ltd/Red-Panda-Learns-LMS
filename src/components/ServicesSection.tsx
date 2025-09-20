import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ServicesSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">What We Do</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our mission is to advance AI education and research through three core activities
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* We Build Products */}
          <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:scale-105 group">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-brand-fuchsia rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">We Build Products</h3>
            <p className="text-muted-foreground mb-6">
              Innovative AI/ML solutions and platforms that solve real-world challenges across industries
            </p>
            <Button variant="outline" className="border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white">
              Learn More
            </Button>
          </Card>
          
          {/* We Conduct Research */}
          <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:scale-105 group">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-fuchsia to-brand-blue rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">We Conduct Research</h3>
            <p className="text-muted-foreground mb-6">
              Cutting-edge research in artificial intelligence and machine learning with global partnerships
            </p>
            <Button variant="outline" className="border-brand-fuchsia/30 text-brand-fuchsia hover:bg-brand-fuchsia hover:text-white">
              Learn More
            </Button>
          </Card>
          
          {/* We Teach */}
          <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:scale-105 group">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-blue to-brand-orange rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4">We Teach</h3>
            <p className="text-muted-foreground mb-6">
              Comprehensive education programs from K-12 to professional development and research training
            </p>
            <Button variant="outline" className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white">
              Learn More
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};