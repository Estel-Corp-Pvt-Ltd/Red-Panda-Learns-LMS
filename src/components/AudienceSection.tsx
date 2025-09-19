import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const AudienceSection = () => {
  const audiences = [
    {
      title: "For Industries",
      description: "AI/ML solutions and workforce training for enterprises",
      links: ["Industry Solutions", "Workforce Training"]
    },
    {
      title: "For Professionals", 
      description: "Advanced AI training for career advancement",
      links: ["LIVE Courses", "Self-Paced Courses", "Research Bootcamp"]
    },
    {
      title: "For Students",
      description: "Research programs and advanced AI/ML courses", 
      links: ["LIVE Courses", "Self-Paced Courses", "Research Bootcamp"]
    },
    {
      title: "For Schools",
      description: "Interactive AI learning platform for K-12 education",
      links: ["Teacher Training", "AI-ML Curriculum", "Interactive Platform"]
    },
    {
      title: "For Universities",
      description: "Academic partnerships and research collaborations",
      links: ["Minor in AI", "Program Electives", "Research Partners"]
    },
    {
      title: "Free Resources",
      description: "YouTube courses and free educational resources",
      links: ["YouTube Channel", "Newsletter", "Free Courses"]
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Who We Serve</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive AI education and solutions tailored for every learner and organization
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {audiences.map((audience, index) => (
            <div key={index} className="card p-6 hover:shadow-lg hover:text transition-all duration-300 hover:scale-[1.00] rounded-2xl">
              <h3 className="text-xl font-bold mb-3 gradient-text">{audience.title} </h3>
 <p className="text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors duration-200">
  {audience.description} 
</p>

              <div className="space-y-2">
                {audience.links.map((link, linkIndex) => (
                  <Button 
                    key={linkIndex}
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start text-left h-auto p-2 text-brand-fuchsia hover:bg-brand-light hover:text-brand-jet dark:hover:text-white transition-colors duration-200"

                  >
                    {link}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};