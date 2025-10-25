import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CURRENCY } from "@/constants";
import { cn } from "@/lib/utils";
import { Bundle } from "@/types/bundle";
import { BookOpen, Tag } from "lucide-react";

interface BundleCardProps {
  bundle: Bundle;
  variant?: 'default' | 'compact';
  onPurchase?: (bundleId: string) => void;
  className?: string;
};

export function BundleCard({
  bundle,
  variant = 'default',
  onPurchase,
  className
}: BundleCardProps) {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: CURRENCY.USD,
    }).format(amount);
  };

  if (variant === 'compact') {
    return (
      <Card className={cn("flex flex-row overflow-hidden hover:shadow-lg transition-all duration-300", className)}>
        <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
          {bundle.thumbnail ? (
            <img
              src={bundle.thumbnail}
              alt={bundle.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="h-8 w-8 text-primary" />
          )}
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                {bundle.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {bundle.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                {bundle.categories.length && bundle.categories.map((category) => (
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    <span>{category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(bundle.regularPrice)}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onPurchase?.(bundle.id)}
                className="whitespace-nowrap"
              >
                Buy Bundle
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card className={cn("overflow-hidden hover:shadow-lg transition-all duration-300 group", className)}>
      <CardHeader className="p-0">
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          {bundle.thumbnail ? (
            <img
              src={bundle.thumbnail}
              alt={bundle.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <BookOpen className="h-16 w-16 text-primary" />
          )}

          <Badge
            variant="secondary"
            className="absolute top-3 left-3 bg-primary/90 text-primary-foreground"
          >
            Bundle
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
          {bundle.title}
        </h3>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {bundle.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {bundle.categories.length && bundle.categories.map((category) => (
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span>{category}</span>
            </div>
          ))}
        </div>

        {bundle.tags && bundle.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {bundle.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {bundle.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{bundle.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(bundle.regularPrice)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          className="w-full"
          size="lg"
          onClick={() => onPurchase?.(bundle.id)}
        >
          Buy Bundle - {formatCurrency(bundle.regularPrice)}
        </Button>
      </CardFooter>
    </Card>
  );
};
