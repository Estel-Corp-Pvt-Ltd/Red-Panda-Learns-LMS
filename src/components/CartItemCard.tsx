import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CART_ACTION } from "@/constants";

type CartItem = {
  id: string;
  title: string;
  instructorName?: string;
  thumbnail?: string;
  regularPrice?: number;
  salePrice?: number;
};

type Props = {
  item: CartItem;
  borderless?: boolean; // set to true if you're wrapping this in a bordered container
};

const CartItemCard: React.FC<Props> = ({ item, borderless = false }) => {
  const { cartDispatch } = useCart();
  const { toast } = useToast();

  const handleRemove = () => {
    toast({
      title: "Course removed",
      description: `${item.title} has been removed from your cart.`,
    });
    cartDispatch({ type: CART_ACTION.REMOVE, id: item.id });
  };

  const hasDiscount =
    typeof item.salePrice === "number" &&
    typeof item.regularPrice === "number" &&
    item.salePrice < item.regularPrice;

  const discountPercent = hasDiscount
    ? Math.round(((item.regularPrice! - item.salePrice!) / item.regularPrice!) * 100)
    : 0;

  const formatPrice = (value?: number) =>
    typeof value === "number" ? `₹${value.toFixed(2)}` : "N/A";

  return (
    <div
      className={[
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5",
        borderless ? "" : "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
      ].join(" ")}
    >
      <Link to={`/course/${item.id}`} className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title || "Course image"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-medium">No Image</span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
            {item.title}
          </h3>
          {item.instructorName && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              by {item.instructorName}
            </p>
          )}

          {/* Price */}
          <div className="mt-2 flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-500">
                  {formatPrice(item.salePrice)}
                </span>
                <span className="text-sm line-through text-muted-foreground">
                  {formatPrice(item.regularPrice)}
                </span>
                <span className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                  ({discountPercent}% OFF)
                </span>
              </>
            ) : (
              <span className="text-lg sm:text-xl font-semibold text-foreground">
                {formatPrice(item.regularPrice ?? item.salePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Remove */}
      <div className="flex-shrink-0">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleRemove}
          aria-label={`Remove ${item.title ?? "item"} from cart`}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  );
};

export default CartItemCard;