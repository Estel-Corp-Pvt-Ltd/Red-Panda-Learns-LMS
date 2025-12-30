import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

import { StripBanner as StripBannerComponent } from "@/components/StripBanner";
import { stripBannerService } from "@/services/stripBannerService";
import { StripBanner as StripBannerType } from "@/types/strip-banner";
import { cn } from "@/lib/utils";

interface StripBannerContextType {
  /** Manually re-fetch banners (e.g. after admin changes) */
  refresh: () => Promise<void>;
  /** Current active banners for the page */
  banners: StripBannerType[];
  /** Loading state */
  loading: boolean;
}

const StripBannerContext = createContext<StripBannerContextType | undefined>(
  undefined
);

export const useStripBanner = () => {
  const ctx = useContext(StripBannerContext);
  if (!ctx) {
    throw new Error("useStripBanner must be used within a StripBannerProvider");
  }
  return ctx;
};

interface StripBannerProviderProps {
  children: ReactNode;
  className?: string;
}

export const StripBannerProvider: React.FC<StripBannerProviderProps> = ({
  children,
  className,
}) => {
  const [banners, setBanners] = useState<StripBannerType[]>([]);
  const [loading, setLoading] = useState(true);


  const getPageType = (): "dashboard" | "landing" | "course" | null => {
    const path = location.pathname;

    if (path.startsWith("/dashboard")) return "dashboard";
    if (path === "/") return "landing";
    if (path.startsWith("/courses/") || path.startsWith("/course/")) return "course";

    return null;
  };

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const result = await stripBannerService.getBannersForPage();
      
      if (result.success) {
        setBanners(result.data);
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const contextValue: StripBannerContextType = {
    refresh: fetchBanners,
    banners,
    loading,
  };

  return (
    <StripBannerContext.Provider value={contextValue}>
      {children}
      
      {/* Strip Banner positioned below navbar */}
      <div className={cn("w-full", className)}>
        
      </div>
    </StripBannerContext.Provider>
  );
};