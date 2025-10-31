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

export default function CartCheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshEnrollments, isEnrolled } = useEnrollment();
  const { cartCourses, cartDispatch, loading: cartLoading } = useCart();
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
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const providers = paymentService.getAvailableProviders();

  const [promoCode, setPromoCode] = useState("");
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });
  const [phoneError, setPhoneError] = useState<string>("");

  // ----------------- Fetch countries on mount -----------------
  useEffect(() => {
    async function fetchCountries() {
      setLoading((l) => ({ ...l, countries: true }));
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/"
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const list = data.data || [];
        if (!Array.isArray(list) || list.length === 0)
          throw new Error("Empty list");
        setCountries(list);
      } catch (error) {
        console.error("Error fetching countries:", error);
        // fallback: allow user manual input
        setCountries([]);
      } finally {
        setLoading((l) => ({ ...l, countries: false }));
      }
    }
    fetchCountries();
  }, []);

  // ----------------- Fetch states when country changes -----------------
  useEffect(() => {
    async function fetchStates() {
      if (!billingAddress.country) return;
      setStates([]);
      setCities([]);
      setLoading((l) => ({ ...l, states: true }));
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/states",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ country: billingAddress.country }),
          }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const list = data.data?.states || [];
        setStates(list);
      } catch (error) {
        console.error("Error fetching states:", error);
        setStates([]);
      } finally {
        setLoading((l) => ({ ...l, states: false }));
      }
    }
    fetchStates();
  }, [billingAddress.country]);

  // ----------------- Fetch cities when state changes -----------------
  useEffect(() => {
    async function fetchCities() {
      if (!billingAddress.state || !billingAddress.country) return;
      setCities([]);
      setLoading((l) => ({ ...l, cities: true }));
      try {
        const res = await fetch(
          "https://countriesnow.space/api/v0.1/countries/state/cities",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country: billingAddress.country,
              state: billingAddress.state,
            }),
          }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        const list = data.data || [];
        setCities(list);
      } catch (error) {
        console.error("Error fetching cities:", error);
        setCities([]);
      } finally {
        setLoading((l) => ({ ...l, cities: false }));
      }
    }
    fetchCities();
  }, [billingAddress.state]);
  // Calculate subtotal from cart courses
  const subtotal = cartCourses.reduce(
    (sum, course) => sum + (course.salePrice || course.regularPrice || 0),
    0
  );

  const regularTotal = cartCourses.reduce(
    (sum, course) => sum + (course.regularPrice || 0),
    0
  );

  const initialSavings = regularTotal - subtotal;

  useEffect(() => {
    if (!user) {
      navigate("/auth/login", {
        state: {
          from: `/checkout`,
          message: "Please login to proceed with checkout.",
        },
      });
    }
  }, [user, navigate]);

  // Check if any cart course is already enrolled
  useEffect(() => {
    if (user && cartCourses.length > 0) {
      const enrolledCourses = cartCourses.filter((course) =>
        isEnrolled(course.id)
      );

      if (enrolledCourses.length > 0) {
        toast({
          title: "Already Enrolled",
          description: `You are already enrolled in ${enrolledCourses.length} course(s). Please remove them from your cart before proceeding.`,
          variant: "default",
        });
      }
    }
  }, [user, cartCourses, isEnrolled, cartDispatch, toast]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && cartCourses.length === 0) {
      navigate("/cart");
    }
  }, [cartCourses, cartLoading, navigate]);

  useEffect(() => {
    if (cartCourses.length > 0 && selectedCurrency) {
      loadPricing();
    }
  }, [cartCourses, selectedCurrency, selectedProvider, discountAmount]);

  const loadPricing = async () => {
    if (cartCourses.length === 0) return;
    setLoadingPricing(true);

    try {
      const basePrice = subtotal;
      const effectivePrice = Math.max(0, basePrice - discountAmount);
      setFinalPrice(effectivePrice);

      const data = await paymentService.calculatePricing(
        effectivePrice,
        selectedCurrency,
        CURRENCY.INR,
        selectedProvider
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

  useEffect(() => {
    if (promoCode.trim() === "" && (appliedCoupon || discountAmount > 0)) {
      clearCoupon();
    }
  }, [promoCode, appliedCoupon, discountAmount]);

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

    // Check coupon applicability for cart (you might need to adjust this based on your coupon rules)
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

  const handleUseCoupon = async () => {
    const usageData = {
      userId: user?.id,
      couponId: appliedCoupon.id,
      usedAt: Timestamp.now(),
    };
    const result = await couponUsageService.recordCouponUsage(usageData);
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
    if (cartCourses.length === 0 || !user || !pricing) return;

    if (selectedProvider === PAYMENT_PROVIDER.PAYPAL) setPaypalClicked(true);
    setIsProcessing(true);

    toast({
      title: "Processing your payment...",
      description: "Please do not refresh or close this window.",
    });

    try {
      // Transform cart courses into transaction line items
      const items: TransactionLineItem[] = cartCourses.map((course) => ({
        itemId: course.id,
        itemType: ENROLLED_PROGRAM_TYPE.COURSE,
        name: course.title,
        amount: course.salePrice || course.regularPrice || 0,
        originalAmount: course.regularPrice,
      }));

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
        // Apply coupon if used
        if (isCouponValid) {
          try {
            await handleUseCoupon();
          } catch (error) {
            console.error("Error applying coupon:", error);
            toast({
              title: "Coupon Error",
              description:
                "There was an issue applying the coupon. Please try again.",
              variant: "destructive",
            });
          }
        }

        // Verify enrollment for all courses
        let allEnrolled = false;
        for (let i = 0; i < 5; i++) {
          await refreshEnrollments();

          const enrolledCount = cartCourses.filter((course) =>
            isEnrolled(course.id)
          ).length;

          if (enrolledCount === cartCourses.length) {
            allEnrolled = true;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }

        // Clear cart after successful payment
        cartDispatch({ type: CART_ACTION.CLEAR });

        if (allEnrolled) {
          toast({
            title: "Enrollment Successful!",
            description: `You are now enrolled in ${cartCourses.length} course(s)`,
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Payment Successful",
            description:
              "Your payment was processed. If you don't see the courses immediately, please refresh the page.",
          });
          navigate("/dashboard");
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

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#0e0f11] p-6">
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton variant="text" lines={8} />
        </div>
      </div>
    );
  }

  const hasDiscount = discountAmount > 0;
  const exchangeRate = Number(pricing?.exchangeRate ?? 1);
  const formatMoney = (amount: number, cur: Currency) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(amount);

  const originalConverted = subtotal * exchangeRate;
  const discountConverted = discountAmount * exchangeRate;
  const totalSavings = initialSavings + discountAmount;

  return (
    <div className="min-h-screen bg-background dark:bg-[#0e0f11] flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="container mx-auto max-w-7xl text-gray-800 dark:text-white">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/cart")}
              className="flex items-center text-blue-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              Complete Your Enrollment
            </h1>
            <p className="text-muted-foreground dark:text-gray-400 text-sm sm:text-base">
              You're enrolling in {cartCourses.length} course(s)
            </p>
          </div>

          {/* Define helper for address validation */}
          {(() => {
            const requiredFilled =
              billingAddress.fullName.trim() &&
              billingAddress.phone.trim() &&
              isValidPhoneNumber(billingAddress.phone) &&
              billingAddress.line1.trim() &&
              billingAddress.city.trim() &&
              billingAddress.state.trim() &&
              billingAddress.postalCode.trim() &&
              billingAddress.country.trim();
            const canPay =
              agreed &&
              requiredFilled &&
              pricing &&
              !loadingPricing &&
              !isProcessing;
            const showMessage = !canPay;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
                {/* LEFT: Payment Section */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Order Summary */}
                  <Card className="bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl shadow-sm">
                    <CardHeader className="border-b border-blue-100 dark:border-zinc-800">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Order Summary ({cartCourses.length} courses)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {cartCourses.map((course) => (
                          <div
                            key={course.id}
                            className="flex justify-between items-start gap-2 pb-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                          >
                            <div className="flex-1">
                              <h4 className="text-sm font-medium line-clamp-2">
                                {course.title}
                              </h4>
                            </div>
                            <div className="text-sm font-medium whitespace-nowrap">
                              {course.salePrice !== course.regularPrice && (
                                <span className="line-through text-gray-400 mr-2">
                                  ₹{course.regularPrice}
                                </span>
                              )}
                              ₹{course.salePrice || course.regularPrice}
                            </div>
                          </div>
                        ))}
                      </div>

                      {pricing && !loadingPricing ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>
                              {formatMoney(originalConverted, selectedCurrency)}
                            </span>
                          </div>
                          {hasDiscount && (
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                              <span>Discount:</span>
                              <span>
                                -
                                {formatMoney(
                                  discountConverted,
                                  selectedCurrency
                                )}
                              </span>
                            </div>
                          )}
                          {totalSavings > 0 && (
                            <div className="flex justify-between text-sm">
                              <span>Total Savings:</span>
                              <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                You save{" "}
                                {formatMoney(
                                  totalSavings * exchangeRate,
                                  selectedCurrency
                                )}
                              </Badge>
                            </div>
                          )}
                          <hr className="my-2 border-gray-200 dark:border-gray-700" />
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold">
                              Total:
                            </span>
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
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        Select Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
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
                                    {(METHOD_LOGOS[provider.id] ?? []).map(
                                      (m) => (
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
                                      )
                                    )}
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
                                    )
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

                  {/* Security */}
                  <Card className="bg-white dark:bg-[#15171a] border border-blue-100 dark:border-blue-500/20 rounded-xl">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium mb-1">Secure Payment</h4>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            All transactions are encrypted. Instant access after
                            payment.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Agreement & CTA */}
                  <div className="space-y-3 pt-2">
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

                    {showMessage && (
                      <div className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-md border border-red-200 dark:border-red-700">
                        Please check "I agree" and fill all billing address
                        fields before continuing.
                      </div>
                    )}

                    <Button
                      onClick={handlePayment}
                      disabled={!canPay}
                      size="lg"
                      className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white dark:text-white shadow-sm ring-2 ring-blue-200 dark:ring-blue-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        "Processing..."
                      ) : loadingPricing ? (
                        "Loading..."
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Pay{" "}
                          {pricing?.formattedTotal ?? pricing?.formattedPrice} &
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

                {/* RIGHT: Coupon + Billing Address */}
                <div className="lg:col-span-7 grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Coupon */}
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
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCoupon();
                            }}
                            disabled={isValidatingCoupon || isProcessing}
                            className="border-blue-200 focus:border-blue-500"
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
                          <span className="text-white text-sm font-bold">
                            1
                          </span>
                        </div>
                        Billing Address
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-6">
                      {/* Name + Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fullName">
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
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone">
                            Phone Number <span className="text-red-500">*</span>
                          </Label>

                          <PhoneInput
                            id="phone"
                            international
                            defaultCountry="IN"
                            smartCaret
                            value={billingAddress.phone}
                            onChange={(value) => {
                              setBillingAddress({
                                ...billingAddress,
                                phone: value || "",
                              });
                              setPhoneError("");
                            }}
                            onBlur={() => {
                              if (
                                billingAddress.phone &&
                                !isValidPhoneNumber(billingAddress.phone)
                              ) {
                                setPhoneError(
                                  "Please enter a valid phone number."
                                );
                              }
                            }}
                            placeholder="Enter your phone number"
                            className="w-full border border-blue-200 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
                          />

                          {phoneError && (
                            <p className="text-red-500 text-sm mt-1">
                              {phoneError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Address lines */}
                      <div>
                        <Label htmlFor="line1">
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
                        />
                      </div>

                      <div>
                        <Label htmlFor="line2">
                          Apartment, Suite, etc.{" "}
                          <span className="text-gray-400 text-xs">
                            (Optional)
                          </span>
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
                        />
                      </div>

                      {/* Country / State / City */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Country */}
                        <div>
                          <Label htmlFor="country">
                            Country <span className="text-red-500">*</span>
                          </Label>
                          {countries.length > 0 ? (
                            <Select
                              value={billingAddress.country}
                              onValueChange={(val) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  country: val,
                                  state: "",
                                  city: "",
                                })
                              }
                            >
                              <SelectTrigger className="w-full border-blue-200 dark:border-zinc-700">
                                <SelectValue
                                  placeholder={
                                    loading.countries
                                      ? "Loading..."
                                      : "Select country"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((c) => (
                                  <SelectItem key={c.country} value={c.country}>
                                    <span className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-blue-600" />
                                      {c.country}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="countryManual"
                              placeholder="Enter country"
                              value={billingAddress.country}
                              onChange={(e) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  country: e.target.value,
                                  state: "",
                                  city: "",
                                })
                              }
                            />
                          )}
                        </div>

                        {/* State */}
                        <div>
                          <Label htmlFor="state">
                            State/Province{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          {states.length > 0 ? (
                            <Select
                              value={billingAddress.state}
                              onValueChange={(val) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  state: val,
                                  city: "",
                                })
                              }
                            >
                              <SelectTrigger
                                disabled={!billingAddress.country}
                                className="w-full border-blue-200 dark:border-zinc-700"
                              >
                                <SelectValue
                                  placeholder={
                                    loading.states
                                      ? "Loading..."
                                      : "Select state"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {states.map((s) => (
                                  <SelectItem key={s.name} value={s.name}>
                                    <span className="flex items-center gap-2">
                                      <Building2 className="w-4 h-4 text-blue-600" />
                                      {s.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Enter state/province"
                              value={billingAddress.state}
                              disabled={!billingAddress.country}
                              onChange={(e) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  state: e.target.value,
                                  city: "",
                                })
                              }
                            />
                          )}
                        </div>

                        {/* City */}
                        <div className="sm:col-span-1">
                          <Label htmlFor="city">
                            City <span className="text-red-500">*</span>
                          </Label>
                          {cities.length > 0 ? (
                            <Select
                              value={billingAddress.city}
                              onValueChange={(val) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  city: val,
                                })
                              }
                            >
                              <SelectTrigger
                                disabled={!billingAddress.state}
                                className="w-50% border-blue-200 dark:border-zinc-700"
                              >
                                <SelectValue
                                  placeholder={
                                    loading.cities
                                      ? "Loading..."
                                      : "Select city"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Enter city"
                              value={billingAddress.city}
                              disabled={!billingAddress.state}
                              onChange={(e) =>
                                setBillingAddress({
                                  ...billingAddress,
                                  city: e.target.value,
                                })
                              }
                            />
                          )}
                        </div>
                        <div>
                          <Label htmlFor="postalCode">
                            ZIP/Postal Code{" "}
                            <span className="text-red-500">*</span>
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
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
