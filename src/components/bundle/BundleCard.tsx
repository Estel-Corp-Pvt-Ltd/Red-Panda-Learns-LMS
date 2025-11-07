import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CURRENCY } from "@/constants";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { Bundle } from "@/types/bundle";
import { BookOpen, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BundleCardProps {
  bundle: Bundle;
  variant?: "default" | "compact";
  onPurchase?: (bundleId: string) => void;
  className?: string;
  isEnrolled?: boolean;
  onAccess?: () => void;
  ownedCoursesCount?: number;
}

export function BundleCard({
  bundle,
  variant = "default",
  onPurchase,
  className,
  isEnrolled,
  onAccess,
  ownedCoursesCount = 0,
}: BundleCardProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: CURRENCY.INR,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  const { cartDispatch, cart } = useCart();
  const navigate = useNavigate();
  const isAddedToCart = cart.some((item) => item.refId == bundle.id);

  // Slash pricing helpers
  const regularPrice =
    typeof bundle.regularPrice === "number" ? bundle.regularPrice : 0;

  const hasSale = typeof bundle.salePrice === "number";
  const salePrice = hasSale ? (bundle.salePrice as number) : regularPrice;

  const isFree = salePrice === 0; // keep your FREE label logic
  const showSlash = hasSale; // show slash whenever a sale price exists

  const totalCourses = bundle.courses?.length || 0;
  const showPartialOwnership =
    ownedCoursesCount > 0 && ownedCoursesCount < totalCourses;
  const fullOwnership = ownedCoursesCount === totalCourses;
    
  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "flex flex-row overflow-hidden hover:shadow-lg transition-all duration-300",
          className
        )}
      >
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
                {bundle.categoryIds.length &&
                  bundle.categoryIds.map((category) => (
                    <div className="flex items-center gap-1" key={category}>
                      <Tag className="h-4 w-4" />
                      <span>{category}</span>
                    </div>
                  ))}
              </div> */}

              {showPartialOwnership && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-yellow-100 text-yellow-800"
                >
                  {ownedCoursesCount}/{totalCourses} courses owned
                </Badge>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="text-right">
                <div className="flex items-baseline gap-2">
                  {showSlash && (
                    <span className="line-through text-muted-foreground">
                      {formatCurrency(regularPrice)}
                    </span>
                  )}
                  <span className="text-lg font-bold text-foreground">
                    {isFree ? "FREE" : formatCurrency(salePrice)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={fullOwnership}
                title={
                  fullOwnership
                    ? `You already own all courses in ${bundle.title} bundle`
                    : undefined
                }
                onClick={() =>
                  !fullOwnership &&
                  (isEnrolled ? onAccess?.() : onPurchase?.(bundle.id))
                }
              >
                {fullOwnership
                  ? "All Courses Owned"
                  : isEnrolled
                    ? "Access Bundle"
                    : `Buy Bundle - ${isFree ? "FREE" : formatCurrency(salePrice)
                    }`}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all duration-300 group",
        className
      )}
    >
      <CardHeader className="p-0 relative">
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

          {showPartialOwnership && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-3 bg-yellow-100 text-yellow-800 text-xs"
            >
              {ownedCoursesCount}/{totalCourses} courses owned
            </Badge>
          )}
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
          {bundle.categoryIds && bundle.categoryIds.length &&
            bundle.categoryIds.map((category) => (
              <div className="flex items-center gap-1" key={category}>
                <Tag className="h-4 w-4" />
                <span>{category}</span>
              </div>
            ))}
        </div> */}

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
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              {showSlash && (
                <span className="line-through text-muted-foreground">
                  {formatCurrency(regularPrice)}
                </span>
              )}
              <span className="text-2xl font-bold text-foreground">
                {isFree ? "FREE" : formatCurrency(salePrice)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex justify-between gap-6">
        <Button
          className="flex-grow"
          hidden={fullOwnership}
          onClick={() => {
            if (isAddedToCart) {
              cartDispatch({ type: "REMOVE", id: bundle.id });
            } else {
              cartDispatch({ type: "ADD", item: { type: "BUNDLE", refId: bundle.id } })
            }
          }}
        >{isAddedToCart ? "Remove from Cart" : "Add to Cart"}</Button>
        <Button
          className="flex-grow"
          disabled={fullOwnership}
          title={
            fullOwnership
              ? `You already own all courses in ${bundle.title} bundle`
              : undefined
          }
          onClick={() => {
            if (!fullOwnership) {
              navigate(`/bundle/${bundle.id}`);
            }
          }
          }
        >
          {fullOwnership
            ? "All Courses Owned"
            : isEnrolled
              ? "Access Bundle"
              : `Buy Bundle - ${isFree ? "FREE" : formatCurrency(salePrice)}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
