/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ArrowLeft,
  CreditCard,
  Lock,
  RefreshCw,
  Shield,
  MapPin,
  Building2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";

import { Header } from "@/components/Header";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { paymentService } from "@/services/paymentService";

import {
  ADDRESS_TYPE,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  PAYMENT_PROVIDER,
} from "@/constants";
import { Coupon } from "@/types/coupon";
import { Currency, PaymentProvider } from "@/types/general";
import { Address } from "@/types/order";
import { TransactionLineItem } from "@/types/transaction";
import { Timestamp } from "firebase/firestore";
// BUNDLE queries (only difference)
import { useBundleCoursesQuery, useBundleQuery } from "@/hooks/useBundleApi";
import { enrollmentService } from "@/services/enrollmentService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import PaymentCheckout from "@/components/payment/PaymentCheckout";
import { Bundle } from "@/types/bundle";
import { bundleService } from "@/services/bundleService";
const providerSupportedCurrencies: Record<PaymentProvider, Currency[]> = {
  RAZORPAY: [CURRENCY.INR, CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
  PAYPAL: [CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
};

const METHOD_LOGOS: Record<
  PaymentProvider,
  { name: string; src: string; className?: string }[]
> = {
  RAZORPAY: [
    { name: "UPI", src: "/upi.webp", className: "h-[30px] w-[32px]" },
    { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
    {
      name: "Mastercard",
      src: "/mastercard.svg",
      className: "h-[20px] w-[32px]",
    },
    { name: "RuPay", src: "/rupay.png", className: "h-[30px] w-[40px]" },
  ],
  PAYPAL: [
    { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
    {
      name: "Mastercard",
      src: "/mastercard.svg",
      className: "h-[20px] w-[32px]",
    },
    { name: "Venmo (US)", src: "/venmo.png", className: "h-[20px] w-[28px]" },
  ],
};

export default function BundleCheckoutPage() {
 const { param } = useParams<{ param: string }>();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<null | Bundle>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

const [bundleId, setBundleId] = useState("");

 const {
   data: bundle,
   isLoading: bundleLoading,
   error: bundleError,
 } = useBundleQuery(param!);

 useEffect(() => {
   if (!param || bundleLoading || !bundle) return;
   setBundleId(bundle.id);
 }, [param, bundleLoading, bundle]);
  
  useEffect(() => {
    const fetchBundle = async () => {
      setIsLoading(true);
      try {
        const data = await bundleService.getBundleById(bundleId);
        setBundle(data);
      } catch (error) {
        console.error("Error fetching bundle:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBundle();
  }, [bundleId]);

  if (bundleLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#0e0f11] p-6">
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton variant="text" lines={8} />
        </div>
      </div>
    );
  }

  if (!bundle) {
    navigate("/");
    return null;
  }

  const handlePaymentSuccess = async (orderId: string) => {
    toast({
      title: "Payment Successful",
      description: "Please do not refresh or close this window.",
    });
    navigate(`/dashboard`);
  }

  return (
    <PaymentCheckout
      items={[{
        itemId: bundle.id,
        itemType: "BUNDLE",
        name: bundle.title,
        amount: bundle.salePrice ?? bundle.regularPrice,
        originalAmount: bundle.regularPrice,
      }]}
      onPaymentSuccess={handlePaymentSuccess}
    />
  );
}
