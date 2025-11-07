import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coupon } from "@/types/coupon";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { useAuth } from "@/contexts/AuthContext";

interface CouponSectionProps {
  promoCode: string;
  setPromoCode: (code: string) => void;
  isCouponValid: boolean;
  setIsCouponValid: (valid: boolean) => void;
  discountAmount: number;
  setDiscountAmount: (amount: number) => void;
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (coupon: Coupon | null) => void;
  couponMessage: string;
  setCouponMessage: (message: string) => void;
  isValidatingCoupon: boolean;
  setIsValidatingCoupon: (validating: boolean) => void;
  subtotal: number;
  isProcessing: boolean;
}

export function CouponSection({
  promoCode,
  setPromoCode,
  isCouponValid,
  setIsCouponValid,
  discountAmount,
  setDiscountAmount,
  appliedCoupon,
  setAppliedCoupon,
  couponMessage,
  setCouponMessage,
  isValidatingCoupon,
  setIsValidatingCoupon,
  subtotal,
  isProcessing,
}: CouponSectionProps) {
  const { user } = useAuth();

  const calculateDiscount = (originalPrice: number, coupon?: Coupon) => {
    if (!coupon) return 0;
    const discountPercentage = coupon.discountPercentage ?? 0;
    return Math.max(
      0,
      Math.min(originalPrice, (originalPrice * discountPercentage) / 100)
    );
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setIsCouponValid(false);
    setDiscountAmount(0);
    setCouponMessage("");
  };

  const handleCoupon = async () => {
    setIsValidatingCoupon(true);
    setCouponMessage("");
    setIsCouponValid(false);

    const code = promoCode.trim();
    if (!code) {
      clearCoupon();
      setIsValidatingCoupon(false);
      return;
    }

    const couponResult = await couponService.getCouponByCode(code);

    if (!couponResult.success) {
      clearCoupon();
      setCouponMessage("Invalid promo code");
      setIsValidatingCoupon(false);
      return;
    }

    const coupon = couponResult.data;
    setAppliedCoupon(coupon);

    // Check coupon applicability for cart
    const applicabilityResult = await couponUsageService.isCouponApplicable(
      user!.id,
      coupon.id,
      null, // No specific courseId for cart
      null,
      null
    );

    if (
      !applicabilityResult.success ||
      !applicabilityResult.data?.isApplicable
    ) {
      clearCoupon();
      setCouponMessage(
        applicabilityResult.data?.reason ?? "Coupon not applicable to cart"
      );
      setIsValidatingCoupon(false);
      return;
    }

    // Calculate discount on subtotal
    setDiscountAmount(calculateDiscount(subtotal, coupon));
    setIsCouponValid(true);
    setCouponMessage("Coupon applied successfully!");
    setIsValidatingCoupon(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCoupon();
    }
  };

  return (
    <Card className="xl:col-span-2 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm">
      <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
            %
          </span>
          Apply Promo Code
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <Label htmlFor="promoCode">Have a promo code?</Label>
          <div className="flex gap-2">
            <Input
              id="promoCode"
              type="text"
              placeholder="Enter code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isValidatingCoupon || isProcessing}
              className="border-blue-200 focus:border-blue-500"
            />
            <Button
              type="button"
              onClick={handleCoupon}
              disabled={!promoCode.trim() || isValidatingCoupon}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isValidatingCoupon ? "Checking..." : "Apply"}
            </Button>
          </div>
          {couponMessage && (
            <p
              className={`text-sm ${isCouponValid
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
                }`}
            >
              {couponMessage}
            </p>
          )}
          {isCouponValid && appliedCoupon && (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">
                  {appliedCoupon.code} Applied
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {appliedCoupon.discountPercentage}% off - Save ₹{discountAmount}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCoupon}
                className="text-green-800 hover:text-green-900 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-800"
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
