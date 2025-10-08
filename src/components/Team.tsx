import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin } from "lucide-react";

export const TeamSection = () => {
  const teamMembers = [
    {
      name: "Dr. Raj Dandekar",
      role: "Co-founder",
      education: "PhD, MIT | B.Tech, IIT Madras",
      image: "https://www.vizuara.com/lovable-uploads/6bb7f718-7a63-42f1-9839-3a8b15bdacec.png",
      Linkedin_link:" https://www.linkedin.com/in/raj-abhijit-dandekar-67a33118a"
    },
    {
      name: "Dr. Rajat Dandekar", 
      role: "Co-founder",
      education: "PhD, Purdue University | B.Tech, IIT Madras",
      image: "https://www.vizuara.com/lovable-uploads/93d168b8-3f90-4854-8ccb-1e39ae2a3b4c.png",
            Linkedin_link:" https://in.linkedin.com/in/rajat-dandekar-901324b1"

    },
    {
      name: "Dr. Sreedath Panat",
      role: "Co-founder", 
      education: "PhD, MIT | B.Tech, IIT Madras",
      image: "https://www.vizuara.com/lovable-uploads/1cb0b8c2-ad88-4e95-879b-b0cae6ae9ecb.png",
            Linkedin_link:" https://www.linkedin.com/in/sreedath-panat"

    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Team Vizuara</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Founded by AI researchers from world's leading institutions
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto mb-12">
          <Card className="p-8 bg-gradient-to-br from-brand-light to-white/50 dark:from-brand-light dark:to-card/50 border-brand-fuchsia/20">
            <div className="text-center">
              <img 
                src="https://www.vizuara.com/lovable-uploads/8dc8e40c-8c8b-48c1-a187-0ee0ef7a4a75.png" 
                alt="Team Vizuara at MIT"
                className="w-half  mx-auto rounded-lg mb-4"
              />
              <p className="text-muted-foreground">The founding team at MIT</p>
            </div>
          </Card>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {teamMembers.map((member, index) => (
            <Card key={index} className="p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-brand-fuchsia to-brand-blue p-1">
                <img 
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold mb-2 gradient-text">{member.name}</h3>
              <p className="text-brand-fuchsia font-semibold mb-2">{member.role}</p>
              <p className="text-sm text-muted-foreground mb-4">{member.education}</p>
              <Button variant="outline" size="sm" className="border-brand-fuchsia/30 text-brand-fuchsia hover:bg-brand-fuchsia hover:text-white">
                <a href={member.Linkedin_link} target="blank">LinkedIn Profile</a>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};