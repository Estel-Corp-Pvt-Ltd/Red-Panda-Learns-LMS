import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { CART_ACTION } from "@/constants";

const CartItemCard = ({ item }) => {
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
    item.salePrice !== undefined &&
    item.regularPrice !== undefined &&
    item.salePrice < item.regularPrice;

  const discountPercent = hasDiscount
    ? Math.round(((item.regularPrice - item.salePrice) / item.regularPrice) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-white">
      <div className="flex items-center space-x-4">
        {/* Thumbnail or Placeholder */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title || "Course image"}
            className="w-20 h-20 object-cover rounded"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 flex items-center justify-center rounded text-gray-500 text-sm font-medium">
            No Image
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {item.title}
          </h3>
          {item.authorName && (
            <p className="text-sm text-gray-500">by {item.authorName}</p>
          )}

          {/* Price Display */}
          <div className="mt-1 flex items-baseline space-x-2">
            {hasDiscount ? (
              <>
                <span className="text-xl font-bold text-green-600">
                  ${item.salePrice.toFixed(2)}
                </span>
                <span className="text-sm line-through text-gray-500">
                  ${item.regularPrice.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-red-500">
                  ({discountPercent}% OFF)
                </span>
              </>
            ) : (
              <span className="text-xl font-semibold text-gray-800">
                ${item.regularPrice?.toFixed(2) ?? "N/A"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={handleRemove}
        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm font-medium transition-colors"
      >
        Remove
      </button>
    </div>
  );
};

export default CartItemCard;
