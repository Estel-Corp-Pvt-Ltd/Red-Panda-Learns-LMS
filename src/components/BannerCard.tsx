import { Banner } from "@/types/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface BannerCardProps {
  banner: Banner;
  className?: string;
}

export function BannerCard({ banner, className }: BannerCardProps) {
  const backgroundStyle = `linear-gradient(to right, ${banner.gradientColors.join(", ")})`;

  return (
    <Card className={`overflow-hidden border-none shadow-lg p-0 ${className}`}>
      <div
        className="relative h-[150px] sm:h-[250px] bg-cover bg-center"
        style={{ backgroundImage: backgroundStyle }}
      >
        {/* Overlay for better text readability when using images */}
        {banner.imageUrl && (
          <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Content */}
        <div style={{ background: `linear-gradient(82deg,rgba(66, 66, 66, 1) 0%, rgba(237, 221, 83, 0) 29%)` }} className="relative inset-0 w-full h-full p-4 sm:p-8 flex items-end sm:items-center">
          <div className="relative z-10 max-w-2xl">
            <h2 className="hidden sm:block text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
              {banner.title}
            </h2>
            <p className="hidden sm:block text-white/95 text-base md:text-lg mb-6 drop-shadow-md line-clamp-3">
              {banner.description}
            </p>
            <div>
              {/* CTA Button */}
              {banner.ctaLink && banner.ctaTitle && (
                banner.ctaLink.startsWith("/") ? (
                  <Link to={banner.ctaLink}>
                    <Button
                      size="lg"
                      className="py-1 px-2 rounded-sm bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white font-semibold shadow-lg"
                    >
                      {banner.ctaTitle}
                      <ArrowRight className="ml-2 h-5 w-5 hidden sm:block" />
                    </Button>
                  </Link>
                ) : (
                  <a href={banner.ctaLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="py-1 px-2 bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white font-semibold shadow-lg"
                    >
                      {banner.ctaTitle}
                      <ArrowRight className="ml-2 h-5 w-5 hidden sm:block" />
                    </Button>
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </Card >
  );
}
