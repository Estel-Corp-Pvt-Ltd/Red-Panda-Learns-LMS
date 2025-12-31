import { Banner } from "@/types/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface BannerCardProps {
  banner: Banner;
}

export function BannerCard({ banner }: BannerCardProps) {
  const backgroundStyle = `linear-gradient(to right, ${banner.gradientColors.join(", ")})`;

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div
        className="relative min-h-[200px] md:min-h-[250px] bg-cover bg-center p-6 md:p-8 flex items-center"
        style={{ backgroundImage: backgroundStyle }}
      >
        {/* Overlay for better text readability when using images */}
        {banner.imageUrl && (
          <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Content */}
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
            {banner.title}
          </h2>
          <p className="text-white/95 text-base md:text-lg mb-6 drop-shadow-md line-clamp-3">
            {banner.description}
          </p>

          {/* CTA Button */}
          {banner.ctaLink && banner.ctaTitle && (
            banner.ctaLink.startsWith("/") ? (
              <Link to={banner.ctaLink}>
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white font-semibold shadow-lg"
                >
                  {banner.ctaTitle}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <a href={banner.ctaLink} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white font-semibold shadow-lg"
                >
                  {banner.ctaTitle}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
