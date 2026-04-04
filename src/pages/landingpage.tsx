import { Header } from "@/components/Header";
import { HeroSection } from "@/components/landing/components/HeroSection";
import { CourseCategories } from "@/components/landing/components/CourseCategories";
import { HowItWorks } from "@/components/landing/components/HowItWorks";
import { ForParents } from "@/components/landing/components/ForParents";
import { ProgressRewards } from "@/components/landing/components/ProgressRewards";
import { TestimonialsCarousel } from "@/components/landing/components/TestimonialsCarousel";
import { PricingSection } from "@/components/landing/components/PricingSection";
import { ImpactStats } from "@/components/landing/components/ImpactStats";
import { NewsletterSignup } from "@/components/landing/components/NewsletterSignup";
import { LandingFooter } from "@/components/landing/components/LandingFooter";
import { BannerSlider } from "@/components/BannerSlider";
import { Banner } from "@/types/banner";
import { useEffect, useState } from "react";
import { bannerService } from "@/services/bannerService";

const LandingPage = () => {
  const [banners, setBanners] = useState<Array<Banner>>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const result = await bannerService.getAllBanners();
        if (result.success) {
          setBanners(result.data.filter((banner) => banner.status === "ACTIVE" && banner.showInLandingPage));
        }
      } catch (error) {
        console.error("Error fetching banners:", error);
      }
    };

    fetchBanners();
  }, []);

  return (
    <div className="min-h-screen bg-background no-scrollbar">
      <Header />
      <HeroSection />
      {banners.length > 0 && (
        <div className="px-2">
          <BannerSlider banners={banners} className="max-w-7xl mx-auto" />
        </div>
      )}
      <CourseCategories />
      <HowItWorks />
      <ForParents />
      <ProgressRewards />
      <TestimonialsCarousel />
      <PricingSection />
      <ImpactStats />
      <NewsletterSignup />
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
