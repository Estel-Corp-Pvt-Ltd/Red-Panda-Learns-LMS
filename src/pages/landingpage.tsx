import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { AudienceSection } from "@/components/AudienceSection";
import { TeamSection } from "@/components/Team";
import { NewsletterSection } from "@/components/NewsletterSection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ServicesSection />
      <AudienceSection />
      <TeamSection />
      <NewsletterSection />
    </div>
  );
};

export default LandingPage;