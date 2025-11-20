import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coupon } from "@/types/coupon";
import { couponService } from "@/services/couponService";
import { TransactionLineItem } from "@/types/transaction";

interface CouponCardProps {
  items: TransactionLineItem[];
  setDiscountAmount: (amount: number) => void;
  setAppliedCoupon: (coupon: Coupon | null) => void;
}

const CouponCard: React.FC<CouponCardProps> = ({ items, setDiscountAmount, setAppliedCoupon }) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");

  const calculateDiscount = (item: TransactionLineItem, coupon: Coupon) => {
    const { itemType, itemId, amount } = item;
    const { discountPercentage, linkedCourseIds, linkedBundleIds } = coupon;

    if (itemType === "COURSE" && linkedCourseIds.includes(itemId)) {
      return (amount * (discountPercentage ?? 0)) / 100;
    }
    if (itemType === "BUNDLE" && linkedBundleIds.includes(itemId)) {
      return (amount * (discountPercentage ?? 0)) / 100;
    }
    return 0;
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponMessage("");
    setDiscount(0);
  };

  const applyCoupon = async () => {
    const code = promoCode.trim();
    if (!code) return;

    setIsValidating(true);
    setCouponMessage("");

    const result = await couponService.getCouponByCode(code);

    if (!result.success || !result.data) {
      clearCoupon();
      setCouponMessage("Invalid promo code");
      setIsValidating(false);
      return;
    }

    if (result.data.totalUsed >= result.data.usageLimit) {
      setCouponMessage("This promo code has reached its usage limit");
      setIsValidating(false);
      return;
    }

    const coupon = result.data;
    const discountAmount = items.reduce((total, item) =>
      total + calculateDiscount(item, coupon), 0
    );

    setAppliedCoupon(coupon);
    setDiscountAmount(discountAmount);
    setDiscount(discountAmount);
    setCouponMessage("Coupon applied successfully!");
    setIsValidating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") applyCoupon();
  };

  const isCouponValid = couponMessage.includes("successfully");

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-6 w-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            %
          </span>
          Apply Promo Code
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="promoCode">Have a promo code?</Label>
          <div className="flex gap-2">
            <Input
              id="promoCode"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isValidating}
            />
            <Button
              onClick={applyCoupon}
              disabled={!promoCode.trim() || isValidating}
            >
              {isValidating ? "Checking..." : "Apply"}
            </Button>
          </div>

          {couponMessage && (
            <p className={`text-sm ${isCouponValid ? "text-green-600" : "text-red-600"}`}>
              {couponMessage}
            </p>
          )}

          {isCouponValid && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">{promoCode} Applied</p>
                <p className="text-sm text-green-600">Save ₹{discount}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearCoupon}>
                Remove
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { CouponCard };
