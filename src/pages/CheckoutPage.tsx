import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Shield, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useCourseQuery } from "@/hooks/useCaching";
import { paymentService } from "@/services/paymentService";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { PaymentProvider } from "@/types/general";
import { PAYMENT_PROVIDER } from "@/constants";
import { Header } from "@/components/Header";
import { enrollmentService } from "@/services/dummyEnrollmentService";
export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshEnrollments, isEnrolled } = useEnrollment();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider>(PAYMENT_PROVIDER.RAZORPAY);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [paypalClicked, setPaypalClicked] = useState(false);

  const { data: course, isLoading } = useCourseQuery(courseId!);
  const providers = paymentService.getAvailableProviders();
  const [isUserEnrolled,setUserIsEnrolled] = useState(false)


  useEffect(() => {
    if (!user) {
      navigate("/auth/login", {
        state: {
          from: `/checkout/${courseId}`,
          message: "Please login to proceed with enrollment.",
        },
      });
    }
  }, [user, courseId, navigate]);


useEffect(() => {
  const checkUserEnrollment = async () => {
    if (user && courseId) {
      const enrolled = await enrollmentService.isUserEnrolled(user.id, courseId);
      console.log("✅ isUserEnrolled returned:", enrolled);
      setUserIsEnrolled(enrolled);
    }
  };

  checkUserEnrollment();
}, [user, courseId]); // <-- dependencies


useEffect(() => {
  if (isUserEnrolled) {
    console.log('CheckoutPage - User already enrolled, redirecting to course');
    navigate(`/course/${courseId}`);
  }
}, [course, user, isEnrolled, courseId, navigate]);


  useEffect(() => {
    if (course && selectedProvider) {
      loadPricing();
    }
  }, [course, selectedProvider]);

  const loadPricing = async () => {
    if (!course) return;

    setLoadingPricing(true);
    try {
      const providerOption = providers.find((p) => p.id === selectedProvider);
      if (providerOption) {
        const pricingData = await paymentService.calculatePricing(
          course.salePrice,
          providerOption.currency
        );
        setPricing(pricingData);
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing information",
        variant: "destructive",
      });
    } finally {
      setLoadingPricing(false);
    }
  };

  const handlePayment = async () => {
    if (!course || !user || !pricing) return;

    console.log("CheckoutPage - Starting payment process:", {
      courseId,
      provider: selectedProvider,
      userId: user.id,
    });

    if (selectedProvider == PAYMENT_PROVIDER.PAYPAL) setPaypalClicked(true);

    setIsProcessing(true);
    try {
      const result = await paymentService.processPayment(
        selectedProvider,
        course,
        user.email!,
        user.id
      );

      console.log("CheckoutPage - Payment result:", result);

      if (result.success && result.transactionId) {
        console.log("CheckoutPage - Payment successful, refreshing enrollments");

        // Refresh enrollment status with multiple attempts
        let enrollmentVerified = false;
        for (let i = 0; i < 5; i++) {
          await refreshEnrollments();

          // Check if enrollment is now active
          if (isEnrolled(course.id)) {
            enrollmentVerified = true;
            break;
          }

          // Wait before next attempt
          if (i < 4) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }

        if (enrollmentVerified) {
          toast({
            title: "Enrollment Successful!",
            description: `You are now enrolled in ${course.title}`,
          });

          // Navigate to course page
          navigate(`/course/${courseId}`);
        } else {
          toast({
            title: "Payment Successful",
            description: "Your payment was processed. If you don't see the course immediately, please refresh the page.",
          });

          // Still navigate to course page
          navigate(`/course/${courseId}`);
        }
      } else {
        console.log("CheckoutPage - Payment failed:", result.error);
        toast({
          title: "Payment Failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("CheckoutPage - Payment error:", error);
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
      <div className="min-h-screen bg-background p-6">
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
 <div className="min-h-screen bg-background flex flex-col">
  {/* Header */}
  <Header />

  <div className="flex-1 p-4 sm:p-6">
    <div className="max-w-2xl mx-auto">
      {/* Back Button + Title */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/course/${courseId}`)}
          className="mb-4 flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Complete Your Enrollment
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          You're just one step away from accessing this course
        </p>
      </div>

      <div className="grid gap-6">
        {/* Course Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Course Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {course.description}
                </p>
                {pricing && !loadingPricing ? (
                  <div className="space-y-2">
                    <div className="text-xl sm:text-2xl font-bold">
                      {pricing.formattedPrice}
                    </div>
                    {pricing.originalCurrency !== pricing.currency && (
                      <div className="text-sm text-muted-foreground">
                        Original: {pricing.originalAmount}{" "}
                        {pricing.originalCurrency} (Rate:{" "}
                        {pricing.exchangeRate.toFixed(4)})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading pricing...</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Select Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedProvider === provider.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedProvider(provider.id)}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        selectedProvider === provider.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    />
                    <div>
                      <span className="font-medium flex items-center gap-2">
                     
                        {/* Provider Logo */}
                        {provider.id === PAYMENT_PROVIDER.RAZORPAY && (
                          <img
                            src="/razorpay-icon.svg"
                            alt="Razorpay"
                            className="h-5"
                          />
                        )}
                        {provider.id === PAYMENT_PROVIDER.PAYPAL && (
                          <img
                            src="/paypal-icon.svg"
                            alt="PayPal"
                            className="h-5"
                          />
                        )}
                      </span>
                      <div className="text-sm text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{provider.currency}</Badge>
                    <Badge variant="secondary">Secure</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PayPal Button Container */}
        {selectedProvider === PAYMENT_PROVIDER.PAYPAL && paypalClicked && (
          <Card>
            <CardContent className="pt-6">
              <div id="paypal-button-container"></div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Secure Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Your payment information is encrypted and secure. We never
                  store your payment details. All transactions are recorded and
                  can be viewed in your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        {selectedProvider && (
          <Button
            onClick={handlePayment}
            disabled={isProcessing || loadingPricing || !pricing}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              "Processing..."
            ) : loadingPricing ? (
              "Loading..."
            ) : pricing ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay {pricing.formattedPrice} & Enroll Now
              </>
            ) : (
              "Loading Payment..."
            )}
          </Button>
        )}
      </div>
    </div>
  </div>
</div>

  );
};
