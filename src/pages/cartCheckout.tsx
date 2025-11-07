import {
  ArrowLeft,
  CreditCard,
  Lock,
  RefreshCw,
  Shield,
  ShoppingCart,
  MapPin,
  Building2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { paymentService } from "@/services/paymentService";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

import { Header } from "@/components/Header";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { TransactionLineItem } from "@/types/transaction";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  ADDRESS_TYPE,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  PAYMENT_PROVIDER,
  CART_ACTION,
} from "@/constants";
import { Address } from "@/types/order";
import { Input } from "@/components/ui/input";
import { Coupon } from "@/types/coupon";
import { Currency, PaymentProvider } from "@/types/general";

import { Timestamp } from "firebase/firestore";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Bundle } from "@/types/bundle";
import PaymentCheckout from "@/components/payment/PaymentCheckout";


export default function CartCheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment();
  const { cartItems, cartBundles, cartCourses, cartDispatch, loading: cartLoading } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (user && cartItems.length > 0) {
      const enrolledItems = cartItems.filter((item) =>
        isEnrolled(item.id)
      );

      if (enrolledItems.length > 0) {
        toast({
          title: "Already Enrolled",
          description: `You are already enrolled in ${enrolledItems.length} course(s). Please remove them from your cart before proceeding.`,
          variant: "default",
        });
      }
    }
  }, [user, cartItems, isEnrolled, cartDispatch, toast]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cartItems.length === 0) {
      navigate("/cart");
    }
  }, [cartItems, cartLoading, navigate]);

  const handlePaymentSuccess = async (orderId: string) => {
    toast({
      title: "Payment Successful",
      description: "Please do not refresh or close this window.",
    });

    cartDispatch({ type: CART_ACTION.CLEAR });
    navigate(`/dashboard`);
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#0e0f11] p-6">
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton variant="text" lines={8} />
        </div>
      </div>
    );
  }

  return (
    <PaymentCheckout
      items={[
        ...cartBundles.map((bundle) => ({
          itemId: bundle.id,
          itemType: ENROLLED_PROGRAM_TYPE.BUNDLE,
          name: bundle.title,
          amount: bundle.salePrice ?? bundle.regularPrice ?? 0,
          originalAmount: bundle.regularPrice,
        })),
        ...cartCourses.map((course) => ({
          itemId: course.id,
          itemType: ENROLLED_PROGRAM_TYPE.COURSE,
          name: course.title,
          amount: course.salePrice ?? course.regularPrice ?? 0,
          originalAmount: course.regularPrice,
        })),
      ]}
      onPaymentSuccess={handlePaymentSuccess}
    />
  );
}
