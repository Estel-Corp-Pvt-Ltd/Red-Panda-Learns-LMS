import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { AudienceSection } from "@/components/AudienceSection";
import { TeamSection } from "@/components/Team";
import { NewsletterSection } from "@/components/NewsletterSection";
import PhilosophySection from "./PhilosophySection";
import ProductsSection from "./ProductsSection";
import ResearchSection from "./ResearchSection";
import AICoursesSection from "./AICoursesSection";
import CorporatesSection from "./CorporatesSection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <PhilosophySection />
      <ProductsSection/>
      {/* <ServicesSection /> */}

      <ResearchSection /> 
      <AICoursesSection />
      <CorporatesSection />
      {/* <AudienceSection /> */}
      <TeamSection />
      <NewsletterSection />
    </div>
  );
};

export default LandingPage;