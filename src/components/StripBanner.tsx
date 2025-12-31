import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StripBanner as StripBannerType } from "@/types/strip-banner";
import { useLocation } from "react-router-dom";

interface StripBannerProps {
  banners: StripBannerType[];
  autoRotate?: boolean;
  rotationInterval?: number;
  className?: string;
  sticky?: boolean;
}

export const StripBanner: React.FC<StripBannerProps> = ({
  banners,
  autoRotate = true,
  rotationInterval = 5000,
  className,
  sticky = true,
}) => {
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const getDismissalKey = (bannerId: string) => `strip_banner_dismissed_${bannerId}`;

  const isBannerDismissed = useCallback(
    (bannerId: string): boolean => {
      if (!mounted) return false;
      const dismissedData = localStorage.getItem(getDismissalKey(bannerId));
      if (!dismissedData) return false;
      try {
        const { expiresAt } = JSON.parse(dismissedData);
        return new Date().getTime() < expiresAt;
      } catch {
        return false;
      }
    },
    [mounted]
  );

  const visibleBanners = banners
    .filter((banner) => !isBannerDismissed(banner.id))
    .filter((banner) => {
      if (location.pathname.startsWith("/dashboard")) {
        return banner.showOnDashboard;
      } else if (location.pathname === "/") {
        return banner.showOnLanding;
      }
      return banner.showOnCoursePages;
    });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visibleBanners.length === 0) return;
    const currentVisibleBanner = visibleBanners[0];
    const delay = (currentVisibleBanner?.delaySeconds || 0) * 1000;
    const timeoutId = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeoutId);
  }, [visibleBanners]);

  useEffect(() => {
    if (!autoRotate || visibleBanners.length <= 1 || !isVisible) return;
    const interval = setInterval(() => {
      setDirection("next");
      setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
      setProgress(0);
    }, rotationInterval);
    return () => clearInterval(interval);
  }, [autoRotate, visibleBanners.length, isVisible, rotationInterval]);

  useEffect(() => {
    if (!isVisible || visibleBanners.length <= 1) return;
    const startTime = Date.now();
    const duration = visibleBanners[currentIndex]?.slideDuration || rotationInterval;
    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      if (newProgress < 100) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [currentIndex, isVisible, rotationInterval, visibleBanners.length, direction]);

  const handleDismiss = useCallback(() => {
    if (visibleBanners.length === 0) return;
    const currentBanner = visibleBanners[currentIndex];
    const dismissalData = {
      bannerId: currentBanner.id,
      dismissedAt: Date.now(),
      expiresAt: Date.now() + currentBanner.dismissalHours * 60 * 60 * 1000,
    };
    localStorage.setItem(getDismissalKey(currentBanner.id), JSON.stringify(dismissalData));
    setIsVisible(false);

    if (visibleBanners.length > 1) {
      setTimeout(() => {
        const newIndex = (currentIndex + 1) % visibleBanners.length;
        setDirection("next");
        setCurrentIndex(newIndex);
        setIsVisible(true);
        setProgress(0);
      }, 400);
    }
  }, [currentIndex, visibleBanners]);

  const handleCtaClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handlePrev = () => {
    setDirection("prev");
    setCurrentIndex((prev) => (prev - 1 + visibleBanners.length) % visibleBanners.length);
    setProgress(0);
  };

  const handleNext = () => {
    setDirection("next");
    setCurrentIndex((prev) => (prev + 1) % visibleBanners.length);
    setProgress(0);
  };

  if (visibleBanners.length === 0 || !isVisible || visibleBanners.length <= currentIndex)
    return null;

  const currentBanner = visibleBanners[currentIndex];

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-in-out z-50 flex justify-center w-full relative",
        className
      )}
    >
      <div
        className={cn(
          "relative  p-[2px] transition-all duration-500",
          "animate-in fade-in-0 slide-in-from-top-4 duration-700 ease-out",
          "w-full"
        )}
        style={{
          background: `linear-gradient(${currentBanner.gradientAngle || 90}deg,
              ${currentBanner.gradientStart},
              ${currentBanner.gradientEnd})`,
        }}
      >
        {/* Inner Capsule: Uses theme variables (background/foreground) instead of hardcoded colors */}
        <div className="relative flex items-center h-14 sm:h-12 px-3 sm:px-4  bg-background/5  overflow-hidden ">
          {/* Central Content Stage */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center justify-center px-2">
            {/* Animated Wrapper */}
            <div
              key={currentBanner.id}
              className={cn(
                "w-full flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 text-center sm:text-left",
                direction === "next" ? "animate-slide-in-right" : "animate-slide-in-left"
              )}
            >
              {/* Title & Badge */}
              <div className="flex items-center gap-2 max-w-full">
                <span className="hidden xs:flex items-center justify-center h-5 w-5 rounded-full bg-foreground/5 shrink-0"></span>
                <h3 className="text-sm font-semibold tracking-tight text-white whitespace-nowrap truncate">
                  {currentBanner.title}
                </h3>
              </div>

              {/* Subtitle */}
              {currentBanner.subtitle && (
                <p className="hidden md:block text-xs text-muted-foreground font-medium truncate max-w-[200px] lg:max-w-xs border-l border-foreground/10 pl-3">
                  {currentBanner.subtitle}
                </p>
              )}

              {/* CTA Button */}
              {currentBanner.ctaActive && currentBanner.ctaLink && (
                <Button
                  onClick={(e) => handleCtaClick(e, currentBanner.ctaLink)}
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "h-7 px-3 text-[10px] sm:text-xs font-semibold rounded-full",
                    "bg-white/10 hover:bg-white/10 text-white border border-foreground/5",
                    "transition-all hover:scale-105 active:scale-95  ml-1 sm:ml-0"
                  )}
                >
                  {currentBanner.ctaText}
                  <ArrowRight className="ml-1.5 h-3 w-3 opacity-70" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1 z-20 pl-2 shrink-0">
            {visibleBanners.length > 1 && (
              <button
                onClick={handleNext}
                className="hidden sm:flex group items-center justify-center w-8 h-8 rounded-full hover:bg-foreground/5 transition-colors"
                aria-label="Next banner"
              ></button>
            )}

            <div className="h-4 w-[1px] bg-foreground/10 mx-1 hidden sm:block" />

            <button
              onClick={handleDismiss}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-destructive/10 hover:text-destructive text-white transition-all duration-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
