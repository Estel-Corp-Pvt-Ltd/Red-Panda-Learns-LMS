import { Banner } from "@/types/banner";
import { BannerCard } from "./BannerCard";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface BannerSliderProps {
  banners: Banner[];
  autoSlideInterval?: number; // milliseconds
}

export function BannerSlider({ banners, autoSlideInterval = 5000 }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide functionality
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [banners.length, autoSlideInterval, isPaused]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (banners.length === 0) return null;

  // If only one banner, show it without slider controls
  if (banners.length === 1) {
    return <BannerCard banner={banners[0]} />;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner Display */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => (
            <div key={banner.id} className="min-w-full">
              <BannerCard banner={banner} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 dark:bg-gray-800/30 shadow-lg rounded-full h-10 w-10 text-gray-900 dark:text-gray-100 hover:bg-primary dark:hover:bg-primary"
        onClick={goToPrevious}
        aria-label="Previous banner"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 dark:bg-gray-800/30 shadow-lg rounded-full h-10 w-10 text-gray-900 dark:text-gray-100 hover:bg-primary dark:hover:bg-primary"
        onClick={goToNext}
        aria-label="Next banner"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${index === currentIndex
              ? "bg-white dark:bg-gray-200 w-8 shadow-md"
              : "bg-white/50 dark:bg-gray-400/50 w-2 hover:bg-white/75 dark:hover:bg-gray-300/75"
              }`}
            aria-label={`Go to banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
