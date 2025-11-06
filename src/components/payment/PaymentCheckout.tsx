import { ArrowLeft, CreditCard, Loader2, Lock, Shield, ShoppingCart, MapPin, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { paymentService } from "@/services/paymentService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { TransactionLineItem } from "@/types/transaction";
import { ADDRESS_TYPE, CURRENCY, PAYMENT_PROVIDER } from "@/constants";
import { Address } from "@/types/order";
import { Currency, PaymentProvider } from "@/types/general";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { orderService } from "@/services/orderService";
import { CouponSection } from "@/components/payment/CouponSection";
import { Coupon } from "@/types/coupon";
import { couponUsageService } from "@/services/couponUsageService";
import { Timestamp } from "firebase/firestore";

const PROVIDER_CONFIG = {
  RAZORPAY: {
    currencies: [CURRENCY.INR, CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
    logos: [
      { name: "UPI", src: "/upi.webp", className: "h-[30px] w-[32px]" },
      { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
      { name: "Mastercard", src: "/mastercard.svg", className: "h-[20px] w-[32px]" },
      { name: "RuPay", src: "/rupay.png", className: "h-[30px] w-[40px]" },
    ],
    icon: "/razorpay-icon.svg"
  },
  PAYPAL: {
    currencies: [CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP],
    logos: [
      { name: "Visa", src: "/visa.png", className: "h-[20px] w-[32px]" },
      { name: "Mastercard", src: "/mastercard.svg", className: "h-[20px] w-[32px]" },
      { name: "Venmo (US)", src: "/venmo.png", className: "h-[20px] w-[28px]" },
    ],
    icon: "/paypal-icon.svg"
  }
};

interface PaymentCheckoutProps {
  items: TransactionLineItem[];
  onPaymentSuccess?: (orderId: string) => void;
}

interface Country {
  country: string;
}

interface State {
  name: string;
}

const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({ items, onPaymentSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOrderVerifying, setIsOrderVerifying] = useState(false);

  const [billingAddress, setBillingAddress] = useState<Address>({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    type: ADDRESS_TYPE.BILLING,
  });

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(PAYMENT_PROVIDER.RAZORPAY);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCY.INR);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Coupon-related state
  const [promoCode, setPromoCode] = useState("");
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Location data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });

  const providers = paymentService.getAvailableProviders();

  // Calculate pricing with coupon discount
  const subtotal = items.reduce((sum, item) => sum + (item.amount || item.originalAmount || 0), 0);
  const regularTotal = items.reduce((sum, item) => sum + (item.originalAmount || 0), 0);
  const savings = regularTotal - subtotal;
  const finalAmount = Math.max(0, subtotal - discountAmount);

  // Simple currency formatting
  const formatMoney = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Validate address fields
  const isAddressValid = () => {
    return (
      billingAddress.fullName.trim() &&
      billingAddress.phone.trim() &&
      isValidPhoneNumber(billingAddress.phone) &&
      billingAddress.line1.trim() &&
      billingAddress.city.trim() &&
      billingAddress.state.trim() &&
      billingAddress.postalCode.trim() &&
      billingAddress.country.trim()
    );
  };

  const canProceed = agreed && isAddressValid() && !isProcessing;

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
  }, [billingAddress.state, billingAddress.country]);

  const verifyOrder = async (orderId: string) => {
    setIsOrderVerifying(true);
    const interval = setInterval(async () => {
      const order = await orderService.getOrderById(orderId);
      console.log("Verifying order status:", order);
      if (order && order.status === "COMPLETED") {
        clearInterval(interval);
        setIsOrderVerifying(false);
        onPaymentSuccess?.(orderId);
      }
    }, 5000);
  }

  const handleUseCoupon = async () => {
    if (!appliedCoupon || !user) return;

    const usageData = {
      userId: user.id,
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
    if (!user || !canProceed) return;

    setIsProcessing(true);

    toast({
      title: "Processing your payment...",
      description: "Please do not refresh or close this window.",
    });

    try {
      // Apply coupon if used
      if (isCouponValid && appliedCoupon) {
        try {
          await handleUseCoupon();
        } catch (error) {
          console.error("Error applying coupon:", error);
          toast({
            title: "Coupon Error",
            description: "There was an issue applying the coupon. Please try again.",
            variant: "destructive",
          });
        }
      }

      await paymentService.processPayment({
        provider: selectedProvider,
        items: items.map(item => ({
          ...item,
          amount: item.amount || item.originalAmount || 0,
        })),
        userEmail: user.email!,
        selectedCurrency,
        billingAddress,
        promoCode: appliedCoupon?.code,
        onPaymentSuccess: verifyOrder,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateAddressField = (field: keyof Address, value: string) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    updateAddressField("phone", value || "");
    setPhoneError("");
  };

  const handlePhoneBlur = () => {
    if (billingAddress.phone && !isValidPhoneNumber(billingAddress.phone)) {
      setPhoneError("Please enter a valid phone number.");
    } else {
      setPhoneError("");
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#0e0f11] flex flex-col">
      <Header />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
              Complete Your Enrollment
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
            {/* Left Column - Order & Billing Address */}
            <div className="lg:col-span-7 space-y-6">
              {/* Order Summary */}
              <Card className="border rounded-xl">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Summary ({items.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex justify-between items-center gap-2 py-2 border-b border-gray-100 dark:border-zinc-800 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {item.name}
                            </h4>
                            <span className="text-xs bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded whitespace-nowrap">
                              {item.itemType === "COURSE" ? "Course" : "Bundle"}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm font-medium whitespace-nowrap">
                          {item.amount !== item.originalAmount ? (
                            <>
                              {item.originalAmount && (
                                <span className="line-through text-gray-400 text-xs mr-1">
                                  ₹{item.originalAmount}
                                </span>
                              )}
                              <span className="text-green-600 dark:text-green-400">
                                ₹{item.amount}
                              </span>
                            </>
                          ) : (
                            <span>₹{item.originalAmount}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatMoney(regularTotal, selectedCurrency)}</span>
                    </div>

                    {savings > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Savings:</span>
                        <span>-{formatMoney(savings, selectedCurrency)}</span>
                      </div>
                    )}

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Coupon Discount:</span>
                        <span>-{formatMoney(discountAmount, selectedCurrency)}</span>
                      </div>
                    )}

                    <div className="border-t pt-3 flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span className="text-xl text-blue-600 dark:text-blue-400">
                        {formatMoney(finalAmount, selectedCurrency)}
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="text-xs text-muted-foreground text-center">
                        You saved {formatMoney(discountAmount + savings, selectedCurrency)} in total!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Billing Address */}
              <Card className="border rounded-xl">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={billingAddress.fullName}
                        onChange={(e) => updateAddressField("fullName", e.target.value)}
                        placeholder="Enter your full name"
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <PhoneInput
                        international
                        defaultCountry="IN"
                        value={billingAddress.phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        placeholder="Enter your phone number"
                        disabled={isProcessing}
                        className="border rounded-md px-3 py-2 bg-background"
                      />
                      {phoneError && <p className="text-red-500 text-sm mt-1">{phoneError}</p>}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <Label htmlFor="line1">Street Address *</Label>
                    <Input
                      id="line1"
                      value={billingAddress.line1}
                      onChange={(e) => updateAddressField("line1", e.target.value)}
                      placeholder="Enter your street address"
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="line2">Apartment, Suite, etc. (Optional)</Label>
                    <Input
                      id="line2"
                      value={billingAddress.line2 || ""}
                      onChange={(e) => updateAddressField("line2", e.target.value)}
                      placeholder="Apartment, suite, unit, etc."
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      {countries.length > 0 ? (
                        <Select
                          value={billingAddress.country}
                          onValueChange={(val) => {
                            updateAddressField("country", val);
                            updateAddressField("state", "");
                            updateAddressField("city", "");
                          }}
                          disabled={isProcessing}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={loading.countries ? "Loading..." : "Select country"} />
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
                          placeholder="Enter country"
                          value={billingAddress.country}
                          onChange={(e) => {
                            updateAddressField("country", e.target.value);
                            updateAddressField("state", "");
                            updateAddressField("city", "");
                          }}
                          disabled={isProcessing}
                        />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province *</Label>
                      {states.length > 0 ? (
                        <Select
                          value={billingAddress.state}
                          onValueChange={(val) => {
                            updateAddressField("state", val);
                            updateAddressField("city", "");
                          }}
                          disabled={!billingAddress.country || isProcessing}
                        >
                          <SelectTrigger disabled={!billingAddress.country} className="w-full">
                            <SelectValue placeholder={loading.states ? "Loading..." : "Select state"} />
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
                          disabled={!billingAddress.country || isProcessing}
                          onChange={(e) => {
                            updateAddressField("state", e.target.value);
                            updateAddressField("city", "");
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      {cities.length > 0 ? (
                        <Select
                          value={billingAddress.city}
                          onValueChange={(val) => updateAddressField("city", val)}
                          disabled={!billingAddress.state || isProcessing}
                        >
                          <SelectTrigger disabled={!billingAddress.state} className="w-full">
                            <SelectValue placeholder={loading.cities ? "Loading..." : "Select city"} />
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
                          disabled={!billingAddress.state || isProcessing}
                          onChange={(e) => updateAddressField("city", e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="postalCode">ZIP/Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={billingAddress.postalCode}
                      onChange={(e) => updateAddressField("postalCode", e.target.value)}
                      placeholder="Enter ZIP or postal code"
                      disabled={isProcessing}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Coupon & Payment */}
            <div className="lg:col-span-5 space-y-6">
              {/* Coupon Section */}
              <CouponSection
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                isCouponValid={isCouponValid}
                setIsCouponValid={setIsCouponValid}
                discountAmount={discountAmount}
                setDiscountAmount={setDiscountAmount}
                appliedCoupon={appliedCoupon}
                setAppliedCoupon={setAppliedCoupon}
                couponMessage={couponMessage}
                setCouponMessage={setCouponMessage}
                isValidatingCoupon={isValidatingCoupon}
                setIsValidatingCoupon={setIsValidatingCoupon}
                subtotal={subtotal}
                isProcessing={isProcessing}
              />

              {/* Payment Methods */}
              <Card className="border rounded-xl">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Select Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {providers.filter((provider) => {
                    if (!billingAddress.country) return true;
                    if (billingAddress.country === "India") {
                      return provider.id === PAYMENT_PROVIDER.RAZORPAY;
                    }
                    return true;
                  }).map((provider) => {
                    const isSelected = selectedProvider === provider.id;
                    const config = PROVIDER_CONFIG[provider.id];

                    return (
                      <div
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`cursor-pointer p-4 rounded-xl border transition-all ${isSelected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
                          }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-3">
                            <div className={`w-4 h-4 mt-1 rounded-full border-2 ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-400"
                              }`} />
                            <div>
                              <div className="flex items-center gap-2 font-medium">
                                <img src={config.icon} className="h-5" alt={provider.id} />
                                {provider.name}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {provider.description}
                              </p>
                              <div className="mt-2 flex gap-1.5">
                                {config.logos.map((logo) => (
                                  <img
                                    key={logo.name}
                                    src={logo.src}
                                    alt={logo.name}
                                    className={logo.className}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <select
                            value={selectedCurrency}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                            className="px-2 py-1 text-sm border rounded bg-background"
                          >
                            {config.currencies
                              .filter((currency) => {
                                if (!billingAddress.country) return true;
                                if (billingAddress.country === "India") {
                                  return currency === "INR";
                                }
                                return currency !== "INR";
                              })
                              .map((currency) => (
                                <option key={currency} value={currency}>
                                  {currency}
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Security & Payment */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Secure Payment</h4>
                      <p className="text-sm text-muted-foreground">
                        All transactions are encrypted. Instant access after payment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agreement & Payment Button */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(!!v)}
                  />
                  <Label htmlFor="agree" className="text-sm leading-snug">
                    I agree to the{" "}
                    <Link to="/terms" className="underline text-blue-600">Terms</Link>
                    ,{" "}
                    <Link to="/privacy" className="underline text-blue-600">Privacy</Link>
                    , and{" "}
                    <Link to="/refund-policy" className="underline text-blue-600">Refund Policy</Link>.
                  </Label>
                </div>

                {!canProceed && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200">
                    Please complete all required fields and agree to terms.
                  </div>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={!canProceed}
                  size="lg"
                  className="w-full"
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Pay {formatMoney(finalAmount, selectedCurrency)} & Enroll Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isOrderVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="animate-spin h-12 w-12 mb-4" />
            <p className="text-gray-800 dark:text-gray-200">Verifying your order, please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCheckout;
