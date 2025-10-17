/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Shield, Lock, RefreshCw , Copy} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useCourseQuery } from "@/hooks/useCaching";
import { useToast } from "@/hooks/use-toast";

import { Header } from "@/components/Header";
import { paymentService } from "@/services/paymentService";
import { enrollmentService } from "@/services/dummyEnrollmentService";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { Currency, PaymentProvider } from "@/types/general";
import { CURRENCY, PAYMENT_PROVIDER } from "@/constants";
import { Address } from "@/types/order";
import { Input } from "@/components/ui/input";
import { Coupon } from "@/types/coupon";
const providerSupportedCurrencies: Record<PaymentProvider, Currency[]> = {
  RAZORPAY: ["INR", "USD", "EUR", "GBP"],
  PAYPAL: ["USD", "EUR", "GBP"],
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

export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshEnrollments, isEnrolled } = useEnrollment();
  const { toast } = useToast();
  // Example: CheckoutPage.tsx

const [billingAddress, setBillingAddress] = useState<Address>({
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
  landmark: "",
  type: "BILLING",
});

const [shippingAddress, setShippingAddress] = useState<Address>({
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
  landmark: "",
  type: "SHIPPING",
});



  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(
    PAYMENT_PROVIDER.RAZORPAY
  );
  const [providerCurrencies, setProviderCurrencies] = useState<
    Record<PaymentProvider, Currency>
  >({
    [PAYMENT_PROVIDER.RAZORPAY]: CURRENCY.INR,
    [PAYMENT_PROVIDER.PAYPAL]: CURRENCY.USD,
  });

  const selectedCurrency = providerCurrencies[selectedProvider];

  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paypalClicked, setPaypalClicked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [appliedCoupon,setAppliedCoupon] = useState< Coupon | null>(null);
  // keep "after" functionality
  const [isUserEnrolled, setUserIsEnrolled] = useState(false);

  const providers = paymentService.getAvailableProviders();
  const { data: course, isLoading } = useCourseQuery(courseId!);

  const [promoCode, setPromoCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/auth/login", {
        state: {
          from: `/checkout/${courseId}`,
          message: "Please login to proceed with enrollment.",
        },
      });
    }
  }, [user, navigate, courseId]);

  // Check if user already enrolled (keep "after" behavior)
  useEffect(() => {
    const checkEnrollment = async () => {
      if (user && courseId) {
        const enrolled = await enrollmentService.isUserEnrolled(
          user.id,
          courseId
        );
        setUserIsEnrolled(enrolled);
      }
    };
    checkEnrollment();
  }, [user, courseId]);

  // Navigate away if already enrolled
  useEffect(() => {
    if (isUserEnrolled) navigate(`/course/${courseId}`);
  }, [isUserEnrolled, navigate, courseId]);

  // Load pricing when course or currency/provider changes
  useEffect(() => {
    if (course && selectedCurrency) loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, selectedCurrency, selectedProvider , discountAmount ]);

const loadPricing = async () => {
  if (!course) return;
  setLoadingPricing(true);
  try {
    const basePrice = course.salePrice || 0;
    const effectivePrice = Math.max(0, basePrice - discountAmount); // <- use discountAmount, clamp
    const data = await paymentService.calculatePricing(
      effectivePrice,
      selectedCurrency,
      selectedProvider,
      CURRENCY.INR
    );
    setPricing(data);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to load pricing information",
      variant: "destructive",
    });
  } finally {
    setLoadingPricing(false);
  }
};


const calcDiscount = (originalPrice: number, coupon?: Coupon) => {
  if (!coupon) return 0;
  const pct = coupon.discountPercentage ?? 0;
  // clamp to [0, originalPrice]
  return Math.max(0, Math.min(originalPrice, (originalPrice * pct) / 100));
};

const clearCoupon = () => {
  setAppliedCoupon(null);
  setIsCouponValid(false);
  setDiscountAmount(0);
  setCouponMessage('');
};

// Auto-clear when input becomes empty (immediately updates price)
useEffect(() => {
  if (promoCode.trim() === '' && (appliedCoupon || discountAmount > 0)) {
    clearCoupon();
  }
}, [promoCode]); // eslint-disable-line react-hooks/exhaustive-deps

 const handleCoupon = async () => {
  setIsValidatingCoupon(true);
  setCouponMessage('');
  setIsCouponValid(false);

  try {
    const code = promoCode.trim();
    if (!code) {
      clearCoupon();
      return;
    }

    const coupon = await couponService.getCouponByCode(code);
    if (!coupon) {
      clearCoupon();
      setCouponMessage("Wrong Promo Code");
      return;
    }

    setAppliedCoupon(coupon); // set for later reference (not required for calc)

    const applicability = await couponUsageService.isCouponApplicable(
      user!.id,
      coupon.id,
      courseId!,
      null,
      null
    );

    if (!applicability.isApplicable) {
      clearCoupon();
      setCouponMessage(applicability.reason ?? "Coupon not applicable");
      return;
    }

    // Compute discount from the coupon object we have (no state race)
    const originalPrice = course!.salePrice || 0;
    const d = calcDiscount(originalPrice, coupon);
    setDiscountAmount(d);
    setIsCouponValid(true);
    setCouponMessage("Coupon is valid, Happy Shopping");
  } catch (error) {
    console.error("Error During Handling Coupon", error);
    clearCoupon();
    setCouponMessage("Error applying coupon. Please try again.");
  } finally {
    setIsValidatingCoupon(false);
  }
};


const applyDiscount = async () => {
  try {
    if (!appliedCoupon) {
      setCouponMessage("No coupon applied.");
      return;
    }

    const discountPercentage = appliedCoupon.discountPercentage || 0;
    const originalPrice = course.salePrice || 0;

    const discountAmount = (originalPrice * discountPercentage) / 100;
    const afterDiscount = originalPrice - discountAmount;

    setDiscountAmount(discountAmount); // or afterDiscount if you're storing final price

    console.log("The amount after discount is", afterDiscount);
  } catch (error) {
    console.log("Error in Applying Discount", error);
  }
};


  const handlePayment = async () => {
    if (!course || !user || !pricing) return;
    if (selectedProvider === PAYMENT_PROVIDER.PAYPAL) setPaypalClicked(true);
    setIsProcessing(true);

    try {
      const result = await paymentService.processPayment(
        selectedProvider,
        course,
        user.email!,
        user.id,
        selectedCurrency,
        CURRENCY.INR,
        billingAddress,
        shippingAddress,
      );

      if (result.success && result.transactionId) {
        let enrollmentVerified = false;

        for (let i = 0; i < 5; i++) {
          await refreshEnrollments();
          if (isEnrolled(course.id)) {
            enrollmentVerified = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }

        if (enrollmentVerified) {
          toast({
            title: "Enrollment Successful!",
            description: `You are now enrolled in ${course.title}`,
          });
          navigate(`/course/${courseId}`);
        } else {
          toast({
            title: "Payment Successful",
            description:
              "Your payment was processed. If you don't see the course immediately, please refresh the page.",
          });
          navigate(`/course/${courseId}`);
        }
      } else {
        toast({
          title: "Payment Failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setPaypalClicked(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#0e0f11] p-6">
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton variant="text" lines={8} />
        </div>
      </div>
    );
  }

  if (!course) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#0e0f11] flex flex-col">
      <Header />
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto text-gray-800 dark:text-white">
          {/* Back / Heading (styled like "before") */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-4 flex items-center text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>

          <h1 className="text-3xl font-bold mb-2">Complete Your Enrollment</h1>
          <p className="text-muted-foreground dark:text-gray-400 text-sm sm:text-base">
            You're just one step away from accessing this course
          </p>

          {/* Course Summary (layout like "before", functionality from "after") */}
          <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6 mt-6">
            <CardHeader>
              <CardTitle>Course Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                {course.description}
              </p>

              {pricing && !loadingPricing ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Course Price:</span>
                    <span className="font-medium">
                      {pricing.formattedPrice}
                    </span>
                  </div>

                  {selectedProvider === PAYMENT_PROVIDER.PAYPAL && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                      <span>All fees and service charges included</span>
                      <span>✓</span>
                    </div>
                  )}

                  <hr className="my-2 border-gray-300 dark:border-gray-600" />

                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold">Total:</span>
                    <span
                      className={`text-xl font-bold ${
                        selectedProvider === PAYMENT_PROVIDER.PAYPAL
                          ? "text-green-600 dark:text-green-400"
                          : "text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {pricing.formattedTotal ?? pricing.formattedPrice}
                    </span>
                  </div>

                  {pricing.originalCurrency !== pricing.currency && (
                    <div className="text-xs text-muted-foreground dark:text-gray-400">
                      Original: {pricing.originalAmount}{" "}
                      {pricing.originalCurrency} (Rate:{" "}
                      {Number(pricing.exchangeRate).toFixed(4)})
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading pricing...</span>
                </div>
              )}
            </CardContent>
          </Card>


 <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm mb-6 mt-6">
            <CardHeader>
              <CardTitle>Coupon</CardTitle>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                {course.description}
              </p>
                 <div className="space-y-2">
  <Label htmlFor="promoCode">Have a promo code?</Label>
  <div className="flex gap-2">
   <Input
  id="promoCode"
  type="text"
  placeholder="Enter code"
  value={promoCode}
  onChange={(e) => setPromoCode(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter') handleCoupon(); }}
  disabled={isValidatingCoupon || isProcessing}
/>
<Button
  type="button"
  onClick={handleCoupon}
  disabled={!promoCode || isValidatingCoupon}
>
  {isValidatingCoupon ? 'Checking...' : 'Apply'}
</Button>
</div>
{couponMessage && (
  <p className={`text-sm ${isCouponValid ? 'text-success' : 'text-destructive'}`}>
    {couponMessage}
  </p>
)}
</div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card className="bg-gradient-to-br from-white to-indigo-50/30 dark:from-zinc-900 dark:to-indigo-950/20 border border-indigo-100 dark:border-zinc-800 rounded-xl shadow-sm mb-6 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-b border-indigo-100 dark:border-zinc-800">
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                Billing Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={billingAddress.fullName}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, fullName: e.target.value })
                    }
                    placeholder="Enter your full name"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={billingAddress.phone}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, phone: e.target.value })
                    }
                    placeholder="Enter your phone number"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="line1" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="line1"
                  value={billingAddress.line1}
                  onChange={(e) =>
                    setBillingAddress({ ...billingAddress, line1: e.target.value })
                  }
                  placeholder="Enter your street address"
                  className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="line2" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Apartment, Suite, etc. <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="line2"
                  value={billingAddress.line2 || ""}
                  onChange={(e) =>
                    setBillingAddress({ ...billingAddress, line2: e.target.value })
                  }
                  placeholder="Apartment number, suite, unit, building, floor, etc."
                  className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, city: e.target.value })
                    }
                    placeholder="Enter your city"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    State/Province <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={billingAddress.state}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, state: e.target.value })
                    }
                    placeholder="Enter your state or province"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    ZIP/Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postalCode"
                    value={billingAddress.postalCode}
                    onChange={(e) =>
                      setBillingAddress({
                        ...billingAddress,
                        postalCode: e.target.value,
                      })
                    }
                    placeholder="Enter ZIP or postal code"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="country" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    value={billingAddress.country}
                    onChange={(e) =>
                      setBillingAddress({ ...billingAddress, country: e.target.value })
                    }
                    placeholder="Enter your country"
                    className="bg-white dark:bg-zinc-800/50 border-indigo-200 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="bg-gradient-to-br from-white to-blue-50/30 dark:from-zinc-900 dark:to-blue-950/20 border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm mb-6 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100 dark:border-zinc-800 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                Shipping Address
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShippingAddress({ ...billingAddress, type: "SHIPPING" })}
                className="border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
              >
                <Copy className="h-3 w-3 mr-2" />
                Same as Billing
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipFullName" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipFullName"
                    value={shippingAddress.fullName}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, fullName: e.target.value })
                    }
                    placeholder="Enter recipient's full name"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="shipPhone" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipPhone"
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, phone: e.target.value })
                    }
                    placeholder="Enter contact phone number"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="shipLine1" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shipLine1"
                  value={shippingAddress.line1}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, line1: e.target.value })
                  }
                  placeholder="Enter delivery street address"
                  className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="shipLine2" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Apartment, Suite, etc. <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  id="shipLine2"
                  value={shippingAddress.line2}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, line2: e.target.value })
                  }
                  placeholder="Apartment number, suite, unit, building, floor, etc."
                  className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipCity" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipCity"
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, city: e.target.value })
                    }
                    placeholder="Enter delivery city"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="shipState" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    State/Province <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipState"
                    value={shippingAddress.state}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, state: e.target.value })
                    }
                    placeholder="Enter state or province"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipPostalCode" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    ZIP/Postal Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipPostalCode"
                    value={shippingAddress.postalCode}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                    }
                    placeholder="Enter ZIP or postal code"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <Label htmlFor="shipCountry" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipCountry"
                    value={shippingAddress.country}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, country: e.target.value })
                    }
                    placeholder="Enter delivery country"
                    className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Providers (structure like "before") */}
          <Card className="bg-card text-card-foreground border border-border rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Select Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {providers.map((provider) => {
                const isSelected = selectedProvider === provider.id;
                const currency = providerCurrencies[provider.id];

                return (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-[#1f1f25] border-indigo-600"
                        : "bg-white dark:bg-[#1a1a1a] border-gray-300 hover:border-indigo-500 dark:border-[#3a3a3a]"
                    }`}
                  >
                    <div className="flex justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex gap-3">
                        <div
                          className={`w-4 h-4 mt-1 rounded-full border-2 ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-400 dark:border-[#555]"
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            <img
                              src={
                                provider.id === "RAZORPAY"
                                  ? "/razorpay-icon.svg"
                                  : "/paypal-icon.svg"
                              }
                              className="h-5"
                              alt={provider.id}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                            {provider.description}
                          </p>
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            {(METHOD_LOGOS[provider.id] ?? []).map((m) => (
                              <img
                                key={m.name}
                                src={m.src}
                                alt={m.name}
                                title={m.name}
                                loading="lazy"
                                className={m.className ?? "h-[20px] w-[32px]"}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:items-end">
                        <select
                          value={providerCurrencies[provider.id]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setProviderCurrencies((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value as Currency,
                            }))
                          }
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-[#444] rounded-md bg-white dark:bg-[#2b2b2b] text-gray-900 dark:text-white"
                        >
                          {providerSupportedCurrencies[provider.id].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{currency}</Badge>
                          <Badge
                            variant="secondary"
                            className="text-green-700 bg-green-100 dark:bg-green-800 dark:text-green-300"
                          >
                            Secure
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Secure Indicator (same) */}
          <Card className="bg-indigo-50 dark:bg-[#1e1e2c] border border-indigo-200 dark:border-indigo-500/20 rounded-xl mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Secure Payment</h4>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    All transactions are encrypted. We do not store your payment
                    information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agree (styled like "before") */}
          <div className="flex items-start gap-3 mt-4">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
            />
            <Label htmlFor="agree" className="text-sm leading-snug">
              I agree to the{" "}
              <Link
                to="/terms"
                className="underline text-indigo-600 dark:text-indigo-400"
              >
                Terms & Conditions
              </Link>
              ,{" "}
              <Link
                to="/privacy"
                className="underline text-indigo-600 dark:text-indigo-400"
              >
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                to="/refund-policy"
                className="underline text-indigo-600 dark:text-indigo-400"
              >
                Refund Policy
              </Link>
              .
            </Label>
          </div>

          {/* CTA (keeps loading/processing states, matches "before" layout) */}
          <Button
            onClick={handlePayment}
            disabled={!agreed || isProcessing || loadingPricing || !pricing}
            size="lg"
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white dark:text-white"
          >
            {isProcessing ? (
              "Processing..."
            ) : loadingPricing ? (
              "Loading..."
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay {pricing?.formattedTotal ?? pricing?.formattedPrice} &
                Enroll Now
              </>
            )}
          </Button>

          {selectedProvider === PAYMENT_PROVIDER.PAYPAL && paypalClicked && (
            <Card className="mt-4 bg-white dark:bg-[#1a1a1a] border dark:border-[#2c2c2e] rounded-xl">
              <CardContent className="pt-6">
                <div id="paypal-button-container"></div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
