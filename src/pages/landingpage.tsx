import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { NewsletterSection } from "@/components/NewsletterSection";
import { TeamSection } from "@/components/Team";
import AICoursesSection from "./AICoursesSection";
import CorporatesSection from "./CorporatesSection";
import Footer from "./Footer";
import OurImpactSection from "./OurImpactSection";
import PhilosophySection from "./PhilosophySection";
import ProductsSection from "./ProductsSection";
import ResearchSection from "./ResearchSection";
import TestimonialsSection from "./TestimonialsSection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <PhilosophySection />
      <ProductsSection />
      <ResearchSection />
      <AICoursesSection />
      <CorporatesSection />
      <TeamSection />
      <OurImpactSection />
      <TestimonialsSection />
      <NewsletterSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
