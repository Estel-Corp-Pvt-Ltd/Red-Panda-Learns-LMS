import {
  ArrowLeft,
  Copy,
  CreditCard,
  Lock,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { paymentService } from "@/services/paymentService";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { useCourseQuery } from "@/hooks/useCaching";

import { Header } from "@/components/Header";
import { couponService } from "@/services/couponService";
import { couponUsageService } from "@/services/couponUsageService";
import { enrollmentService } from "@/services/enrollmentService";
import { TransactionLineItem } from "@/types/transaction";

import {
  ADDRESS_TYPE,
  CURRENCY,
  ENROLLED_PROGRAM_TYPE,
  PAYMENT_PROVIDER,
} from "@/constants";
import { Address } from "@/types/order";
import { Input } from "@/components/ui/input";
import { Coupon } from "@/types/coupon";
import { Currency, PaymentProvider } from "@/types/general";

import { Timestamp } from "firebase/firestore";
import { EnrolledProgramType } from "@/types/general";
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

export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshEnrollments, isEnrolled } = useEnrollment();
  const { toast } = useToast();

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
    type: ADDRESS_TYPE.BILLING,
  });

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(
    PAYMENT_PROVIDER.RAZORPAY,
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
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  // keep "after" functionality
  const [isUserEnrolled, setUserIsEnrolled] = useState(false);

  const providers = paymentService.getAvailableProviders();
  const { data: course, isLoading } = useCourseQuery(courseId!);

  const [promoCode, setPromoCode] = useState("");
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

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
    if (user && courseId) {
      if (isEnrolled(courseId)) {
        setUserIsEnrolled(true);
      } else {
        setUserIsEnrolled(false);
      }
    }
  }, [user, courseId]);

  useEffect(() => {
    if (isUserEnrolled) navigate(`/course/${courseId}`);
  }, [isUserEnrolled, navigate, courseId]);

  useEffect(() => {
    if (course && selectedCurrency) loadPricing();
  }, [course, selectedCurrency, selectedProvider, discountAmount]);

  const loadPricing = async () => {
    if (!course) return;
    setLoadingPricing(true);

    try {
      const basePrice = course.salePrice || 0;
      const effectivePrice = Math.max(0, basePrice - discountAmount);
      setFinalPrice(effectivePrice);

      const data = await paymentService.calculatePricing(
        effectivePrice,
        selectedCurrency,
        CURRENCY.INR,
        selectedProvider,
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

  const calculateDiscount = (originalPrice: number, coupon?: Coupon) => {
    if (!coupon) return 0;
    const discountPercentage = coupon.discountPercentage ?? 0;

    // Protects against scenarios where discountPercentage might accidently have been set greater than 100
    return Math.max(
      0,
      Math.min(originalPrice, (originalPrice * discountPercentage) / 100),
    );
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setIsCouponValid(false);
    setPromoCode("");
    setDiscountAmount(0);
    setCouponMessage("");
  };

  // Auto-clear when input becomes empty (immediately updates price)
  useEffect(() => {
    if (promoCode.trim() === "" && (appliedCoupon || discountAmount > 0)) {
      clearCoupon();
    }
  }, [promoCode, appliedCoupon, discountAmount, clearCoupon]);

  const handleCoupon = async () => {
    setIsValidatingCoupon(true);
    setCouponMessage("");
    setIsCouponValid(false);

    try {
      const code = promoCode.trim();
      if (!code) {
        clearCoupon();
        setCouponMessage("Please enter a valid promo code");
        return;
      }

      const couponResult = await couponService.getCouponByCode(code);

      if (!couponResult.success) {
        clearCoupon();
        setCouponMessage("Invalid promo code");
        setPromoCode(""); // 👈 optional UX improvement: clear field
        return;
      }

      const coupon = couponResult.data;
      setAppliedCoupon(coupon);

      const applicabilityResult = await couponUsageService.isCouponApplicable(
        user!.id,
        coupon.id,
        courseId!,
        null,
        null,
      );

      if (
        !applicabilityResult.success ||
        !applicabilityResult.data?.isApplicable
      ) {
        clearCoupon();
        setCouponMessage(
          applicabilityResult.data?.reason ?? "Coupon not applicable",
        );
        setPromoCode("");
        return;
      }

      const originalPrice = course!.salePrice || 0;
      setDiscountAmount(calculateDiscount(originalPrice, coupon));
      setIsCouponValid(true);
      setCouponMessage("Coupon is valid, Happy Learning!");
    } catch (err) {
      clearCoupon();
      setCouponMessage("Error validating coupon. Please try again.");
      setPromoCode("");
    } finally {
      setIsValidatingCoupon(false);
    }
  };
  const handleUseCoupon = async () => {
    const usageDate = {
      userId: user?.id,
      couponId: appliedCoupon.id,
      usedAt: Timestamp.now(),
    };
    const result = await couponUsageService.recordCouponUsage(usageDate);
    if (result.success) {
      toast({
        title: "Coupon successfully applied!",
      });
      return;
    }
    toast({
      title: "Failed to apply coupon!",
    });
  };

  const handlePayment = async () => {
    if (!course || !user || !pricing) return;
    if (selectedProvider === PAYMENT_PROVIDER.PAYPAL) setPaypalClicked(true);
    setIsProcessing(true);

    toast({
      title: "Processing your payment...",
      description: "Please do not refresh or close this window.",
    });

    try {
      const items: TransactionLineItem[] = [
        {
          itemId: course.id,
          itemType: ENROLLED_PROGRAM_TYPE.COURSE, // Course --> Checkout Page for Course
          name: course.title,
          amount: finalPrice,
          originalAmount: course.salePrice,
        },
      ];

      const result = await paymentService.processPayment({
        provider: selectedProvider,
        items,
        finalPrice,
        userEmail: user.email!,
        userId: user.id,
        selectedCurrency,
        baseCurrency: CURRENCY.INR,
        billingAddress,
      });

      if (result.success && result.transactionId) {
        let enrollmentVerified = false;
        await handleUseCoupon();
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

  const hasDiscount = discountAmount > 0;
  const exchangeRate = Number(pricing?.exchangeRate ?? 1);
  const formatMoney = (amount: number, cur: Currency) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(amount);

  const originalConverted = course ? (course.salePrice || 0) * exchangeRate : 0;
  const discountConverted = discountAmount * exchangeRate;

  return (
    <div className="min-h-screen bg-background dark:bg-[#0e0f11] flex flex-col justify-start">
      <Header />

      {/* main container */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="container mx-auto max-w-7xl text-gray-800 dark:text-white pt-8">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(`/course/${courseId}`)}
              className="flex items-center text-blue-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              Complete Your Enrollment
            </h1>
            <p className="text-muted-foreground dark:text-gray-400 text-sm sm:text-base">
              You're just one step away from accessing this course
            </p>
          </div>

          {/* Bento layout without any sticky */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RIGHT: Payment & Summary (focus area) */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-6">
              {/* Course Summary */}
              <Card className="bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
                  <CardTitle>Course Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                    {course.description}
                  </p>

                  {pricing && !loadingPricing ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between text-sm">
                        <span>Course Price:</span>
                        <div className="flex items-baseline gap-2">
                          {hasDiscount ? (
                            <>
                              <span className="line-through text-gray-400">
                                {formatMoney(
                                  originalConverted,
                                  selectedCurrency,
                                )}
                              </span>
                              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                You save{" "}
                                {formatMoney(
                                  discountConverted,
                                  selectedCurrency,
                                )}
                              </Badge>
                            </>
                          ) : (
                            <span className="font-medium">
                              {formatMoney(originalConverted, selectedCurrency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedProvider === PAYMENT_PROVIDER.PAYPAL && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                          <span>No hidden fees with PayPal</span>
                          <span>✓</span>
                        </div>
                      )}

                      <hr className="my-2 border-gray-200 dark:border-gray-700" />

                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">Total:</span>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
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
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm">Loading pricing...</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Providers */}
              <Card className="bg-card text-card-foreground border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" /> Select
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {providers.map((provider) => {
                    const isSelected = selectedProvider === provider.id;

                    return (
                      <div
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`cursor-pointer p-4 rounded-xl border transition ${
                          isSelected
                            ? "bg-blue-50 dark:bg-[#1f2330] border-blue-600"
                            : "bg-white dark:bg-[#1a1a1a] border-gray-300 hover:border-blue-500 dark:border-[#3a3a3a]"
                        }`}
                      >
                        <div className="flex justify-between gap-4 flex-wrap sm:flex-nowrap">
                          <div className="flex gap-3">
                            <div
                              className={`w-4 h-4 mt-1 rounded-full border-2 ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600"
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
                                    className={
                                      m.className ?? "h-[20px] w-[32px]"
                                    }
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
                              {providerSupportedCurrencies[provider.id].map(
                                (c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ),
                              )}
                            </select>
                            <Badge
                              variant="secondary"
                              className="text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                            >
                              Secure
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Secure */}
              <Card className="bg-white dark:bg-[#15171a] border border-blue-100 dark:border-blue-500/20 rounded-xl">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Secure Payment</h4>
                      <p className="text-sm text-muted-foreground dark:text-gray-400">
                        All transactions are encrypted. Instant access after
                        payment. 7‑day refund guarantee.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agree + CTA */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                  />
                  <Label htmlFor="agree" className="text-sm leading-snug">
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      Terms & Conditions
                    </Link>
                    ,{" "}
                    <Link
                      to="/privacy"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      Privacy Policy
                    </Link>
                    , and{" "}
                    <Link
                      to="/refund-policy"
                      className="underline text-blue-600 dark:text-blue-400"
                    >
                      Refund Policy
                    </Link>
                    .
                  </Label>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={
                    !agreed || isProcessing || loadingPricing || !pricing
                  }
                  size="lg"
                  className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white dark:text-white shadow-sm ring-2 ring-blue-200 dark:ring-blue-900"
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

                {selectedProvider === PAYMENT_PROVIDER.PAYPAL &&
                  paypalClicked && (
                    <Card className="mt-2 bg-white dark:bg-[#1a1a1a] border dark:border-[#2c2c2e] rounded-xl">
                      <CardContent className="pt-6">
                        <div id="paypal-button-container"></div>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </div>

            {/* LEFT: Coupon first, Address second */}
            <div className="order-2 lg:order-1 lg:col-span-7 grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Coupon */}
              <Card className="xl:col-span-2 bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                      %
                    </span>
                    Coupon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="promoCode">Have a promo code?</Label>
                    <div className="flex gap-2">
                      <Input
                        id="promoCode"
                        type="text"
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCoupon();
                        }}
                        disabled={isValidatingCoupon || isProcessing}
                        className="border-blue-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-zinc-700 dark:focus:border-blue-500"
                      />
                      <Button
                        type="button"
                        onClick={handleCoupon}
                        disabled={!promoCode || isValidatingCoupon}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isValidatingCoupon ? "Checking..." : "Apply"}
                      </Button>
                    </div>
                    {couponMessage && (
                      <p
                        className={`text-sm ${
                          isCouponValid
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {couponMessage}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card className="xl:col-span-2 bg-white/90 dark:bg-zinc-950 border border-blue-50 dark:border-zinc-900 rounded-xl shadow-sm overflow-hidden">
                <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {/* address fields unchanged */}
                  {/* ... all your Input and Label elements as before ... */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="fullName"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={billingAddress.fullName}
                        onChange={(e) =>
                          setBillingAddress({
                            ...billingAddress,
                            fullName: e.target.value,
                          })
                        }
                        placeholder="Enter your full name"
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={billingAddress.phone}
                        onChange={(e) =>
                          setBillingAddress({
                            ...billingAddress,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Enter your phone number"
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="line1"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                    >
                      Street Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="line1"
                      value={billingAddress.line1}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          line1: e.target.value,
                        })
                      }
                      placeholder="Enter your street address"
                      className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="line2"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                    >
                      Apartment, Suite, etc.{" "}
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    </Label>
                    <Input
                      id="line2"
                      value={billingAddress.line2 || ""}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          line2: e.target.value,
                        })
                      }
                      placeholder="Apartment number, suite, unit, building, floor, etc."
                      className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="city"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
                        City <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={billingAddress.city}
                        onChange={(e) =>
                          setBillingAddress({
                            ...billingAddress,
                            city: e.target.value,
                          })
                        }
                        placeholder="Enter your city"
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="state"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
                        State/Province <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="state"
                        value={billingAddress.state}
                        onChange={(e) =>
                          setBillingAddress({
                            ...billingAddress,
                            state: e.target.value,
                          })
                        }
                        placeholder="Enter your state or province"
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="postalCode"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
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
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="country"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block"
                      >
                        Country <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="country"
                        value={billingAddress.country}
                        onChange={(e) =>
                          setBillingAddress({
                            ...billingAddress,
                            country: e.target.value,
                          })
                        }
                        placeholder="Enter your country"
                        className="bg-white dark:bg-zinc-800/50 border-blue-200 dark:border-zinc-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
