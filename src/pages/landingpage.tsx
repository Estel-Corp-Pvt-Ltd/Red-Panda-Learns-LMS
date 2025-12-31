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
import { BannerSlider } from "@/components/BannerSlider";
import { Banner } from "@/types/banner";
import { useEffect, useState } from "react";
import { bannerService } from "@/services/bannerService";

const LandingPage = () => {
  const [banners, setBanners] = useState<Array<Banner>>([]);

  useEffect(() => {
    // Fetch banners from your API or data source
    const fetchBanners = async () => {
      try {
        const result = await bannerService.getAllBanners();
        if (result.success) {
          setBanners(result.data.filter((banner) => banner.status === "ACTIVE" && banner.showInDashboard));
        }
      } catch (error) {
        console.error("Error fetching banners:", error);
      }
    };

    fetchBanners();
  }, []);

  return (
    <div className="min-h-screen bg-background no-scrollbar .no-scrollbar::-webkit-scrollbar">
      <Header />
      <HeroSection />
      <div className="px-2" >
        <BannerSlider banners={banners} className="max-w-7xl mx-auto" />
      </div>
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
