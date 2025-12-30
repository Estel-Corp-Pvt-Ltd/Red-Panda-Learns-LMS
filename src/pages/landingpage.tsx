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
import { StripBannerProvider } from "@/components/StripBannerProvider";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background no-scrollbar .no-scrollbar::-webkit-scrollbar">
      <Header />
      {/* <StripBannerProvider className=" mx-auto px-2 mt-1"> */}
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
      {/* </StripBannerProvider> */}
    </div>
  );
};

export default LandingPage;
