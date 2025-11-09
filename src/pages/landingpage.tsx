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
import Footer from "./Footer";
import TestimonialsSection from "./TestimonialsSection";
import OurImpactSection from "./OurImpactSection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Maintenance Banner */}
      <div className="w-full bg-amber-50 dark:bg-amber-900/30 border-y border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-50">
        <div
          className="mx-auto max-w-7xl px-4 py-2 text-center text-sm sm:text-base"
          role="status"
          aria-live="polite"
        >
          We are upgrading our website. Please expect disruption of features, services and access till Monday EOD IST.
        </div>
      </div>

      <HeroSection />
      <PhilosophySection />
      <ProductsSection />
      {/* <ServicesSection /> */}

      <ResearchSection />
      <AICoursesSection />
      <CorporatesSection />
      {/* <AudienceSection /> */}
      <TeamSection />
      <OurImpactSection />
      <TestimonialsSection />
      <NewsletterSection />
      <Footer />
    </div>
  );
};

export default LandingPage;