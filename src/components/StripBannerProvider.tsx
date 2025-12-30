import React, { useState, useEffect } from "react";
import { StripBanner } from "../components/StripBanner";
import { ReactNode } from "react";

import { stripBannerService } from "@/services/stripBannerService";

import { StripBanner as StripBannerType } from "@/types/strip-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StripBannerProviderProps {
  children: React.ReactNode;
  className?: string;
}

export const StripBannerProvider: React.FC<StripBannerProviderProps> = ({
  children,
  className,
}) => {
  const [banners, setBanners] = useState<StripBannerType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const result = await stripBannerService.getBannersForPage();
        console.log("Fetched banners:", result);
        if (result.success) {
          setBanners(result.data);
        }
      } catch (error) {
        console.error("Error fetching banners:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  console.log("Rendering StripBannerProvider with banners:", banners);
  return (
    <>
      <div className={cn("container mx-auto px-4 mt-4", className)}>
        {loading ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : banners.length > 0 ? (
          <StripBanner
            banners={banners}
            autoRotate={true}
            rotationInterval={5000}
            className="mb-4"
          />
        ) : null}
      </div>
      {children}
    </>
  );
};
