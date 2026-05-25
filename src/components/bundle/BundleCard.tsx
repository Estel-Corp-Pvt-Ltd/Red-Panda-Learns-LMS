import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CURRENCY, USER_ROLE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { Bundle } from "@/types/bundle";
import { BookOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY.INR,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

interface BundleCardProps {
  bundle: Bundle;
  variant?: "default" | "compact";
  onPurchase?: (bundleId: string) => void;
  className?: string;
  isEnrolled?: boolean;
  onAccess?: () => void;
  ownedCoursesCount?: number;
};

interface PriceBlockProps {
  bundle: Bundle;
  isFree: boolean;
  priceClassName?: string;
};

function PriceBlock({ bundle, isFree, priceClassName }: PriceBlockProps) {
  const displayPrice = bundle.salePrice ?? bundle.regularPrice;
  const showStrikethrough = bundle.regularPrice > bundle.salePrice;
  return (
    <div className="flex items-baseline gap-2">
      {showStrikethrough && (
        <span className="line-through text-muted-foreground">
          {formatCurrency(bundle.regularPrice)}
        </span>
      )}
      <span className={cn("font-bold text-foreground", priceClassName)}>
        {isFree ? "FREE" : formatCurrency(displayPrice)}
      </span>
    </div>
  );
}

interface PrimaryCTAProps {
  bundle: Bundle;
  isFree: boolean;
  fullOwnership: boolean;
  isEnrolled?: boolean;
  onClick: () => void;
  className?: string;
  size?: "default" | "sm" | "lg";
}

function PrimaryCTA({
  bundle,
  isFree,
  fullOwnership,
  isEnrolled,
  onClick,
  className,
  size,
}: PrimaryCTAProps) {
  const priceLabel = isFree ? "FREE" : formatCurrency(bundle.salePrice ?? bundle.regularPrice);
  const label = fullOwnership
    ? "All Courses Owned"
    : isEnrolled
      ? "Access Bundle"
      : `Buy Bundle - ${priceLabel}`;
  return (
    <Button
      className={className}
      size={size}
      disabled={fullOwnership}
      title={fullOwnership ? `You already own all courses in ${bundle.title} bundle` : undefined}
      onClick={onClick}
    >
      {label}
    </Button>
  );
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
  const { user } = useAuth();
  const { cartDispatch, cart } = useCart();
  const navigate = useNavigate();
  const isAddedToCart = cart.some((item) => item.refId === bundle.id);

  const isFree = bundle.salePrice === 0;
  const totalCourses = bundle.courses?.length || 0;
  const showPartialOwnership = ownedCoursesCount > 0 && ownedCoursesCount < totalCourses;
  const fullOwnership = ownedCoursesCount === totalCourses;

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "flex flex-row overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer",
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
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{bundle.title}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {bundle.description}
              </p>

              {showPartialOwnership && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {ownedCoursesCount}/{totalCourses} courses owned
                </Badge>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 ml-4">
              <PriceBlock bundle={bundle} isFree={isFree} priceClassName="text-lg" />

              <PrimaryCTA
                bundle={bundle}
                isFree={isFree}
                fullOwnership={fullOwnership}
                isEnrolled={isEnrolled}
                className="w-full"
                size="lg"
                onClick={() => (isEnrolled ? onAccess?.() : onPurchase?.(bundle.id))}
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer",
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
        <h3 className="text-xl font-semibold text-foreground mb-2 line-clamp-1">{bundle.title}</h3>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{bundle.description}</p>

        {bundle.tags && bundle.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {bundle.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
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
            <PriceBlock bundle={bundle} isFree={isFree} priceClassName="text-2xl" />
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4">
        {user?.role === USER_ROLE.ADMIN ? (
          <div className="pt-0 flex justify-between gap-6 w-full">
            <Link to={`/admin/edit-bundle/${bundle.slug}`}>
              <Button>Edit Bundle</Button>
            </Link>
            <Link to={`/course-bundle/${bundle.slug}`}>
              <Button>View Bundle</Button>
            </Link>
          </div>
        ) : (
          <div className="pt-0 flex justify-between gap-6 w-full">
            <Button
              className="flex-grow"
              hidden={fullOwnership}
              onClick={() => {
                if (isAddedToCart) {
                  cartDispatch({ type: "REMOVE", id: bundle.id });
                } else {
                  cartDispatch({
                    type: "ADD",
                    item: { type: "BUNDLE", refId: bundle.id },
                  });
                }
              }}
            >
              {isAddedToCart ? "Remove from Cart" : "Add to Cart"}
            </Button>
            <PrimaryCTA
              bundle={bundle}
              isFree={isFree}
              fullOwnership={fullOwnership}
              isEnrolled={isEnrolled}
              className="flex-grow"
              onClick={() => navigate(`/course-bundle/${bundle.slug}`)}
            />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
