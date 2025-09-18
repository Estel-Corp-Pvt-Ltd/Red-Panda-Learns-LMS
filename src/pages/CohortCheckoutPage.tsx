import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Shield, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCohort } from "@/contexts/CohortContext";
import { useCohortQuery } from "@/hooks/useFirebaseApi";
import { paymentService } from "@/services/paymentService";
import { currencyService } from "@/services/currencyService";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { PaymentProvider, Currency } from "@/types/transaction";

export default function CohortCheckoutPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolledInCohort, refreshCohortEnrollments } = useCohort();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("razorpay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const { data: cohort, isLoading } = useCohortQuery(cohortId!);
  const providers = paymentService.getAvailableProviders();

  useEffect(() => {
    if (!user) {
      navigate("/auth/login", {
        state: {
          from: `/cohort/${cohortId}/checkout`,
          message: "Please login to proceed with cohort enrollment.",
        },
      });
    }
  }, [user, cohortId, navigate]);

  // Check if already enrolled
  useEffect(() => {
    if (cohort && user && isEnrolledInCohort(cohort.id)) {
      console.log('CohortCheckoutPage - User already enrolled, redirecting to dashboard');
      navigate(`/cohort/${cohortId}/dashboard`);
    }
  }, [cohort, user, isEnrolledInCohort, cohortId, navigate]);

  useEffect(() => {
    if (cohort && selectedProvider) {
      loadPricing();
    }
  }, [cohort, selectedProvider]);

  const loadPricing = async () => {
    if (!cohort) return;

    setLoadingPricing(true);
    try {
      const providerOption = providers.find((p) => p.id === selectedProvider);
      if (providerOption) {
        // Convert cohort price to provider currency
        const conversion = await currencyService.convertAmount(
          cohort.price,
          cohort.currency,
          providerOption.currency
        );
        
        setPricing({
          amount: conversion.convertedAmount,
          currency: providerOption.currency,
          originalAmount: cohort.price,
          originalCurrency: cohort.currency,
          exchangeRate: conversion.exchangeRate,
          formattedPrice: `${providerOption.currency === 'USD' ? '$' : '₹'}${conversion?.convertedAmount?.toLocaleString()}`,
        });
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
    if (!cohort || !user || !pricing) return;

    console.log("CohortCheckoutPage - Starting payment process:", {
      cohortId,
      provider: selectedProvider,
      userId: user.uid,
    });

    setIsProcessing(true);
    try {
      const result = await paymentService.processCohortPayment(
        selectedProvider,
        cohort,
        user.email!,
        user.uid
      );

      console.log("CohortCheckoutPage - Payment result:", result);

      if (result.success && result.transactionId) {
        console.log("CohortCheckoutPage - Payment successful, refreshing enrollments");

        // Refresh enrollment status
        await refreshCohortEnrollments();

        toast({
          title: "Enrollment Successful!",
          description: `You are now enrolled in ${cohort.name}`,
        });

        // Navigate to cohort dashboard
        navigate(`/cohort/${cohortId}/dashboard`);
      } else {
        console.log("CohortCheckoutPage - Payment failed:", result.error);
        toast({
          title: "Payment Failed",
          description: result.error || "Something went wrong",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("CohortCheckoutPage - Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : '₹';
    return `${symbol}${amount?.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!cohort) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <ErrorState
            title="Cohort not found"
            description="The requested cohort could not be found."
          />
          <div className="mt-4">
            <Button asChild>
              <a href="/courses">Browse Courses</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const spotsLeft = cohort.maxStudents - cohort.currentEnrollments;
  const isFull = spotsLeft <= 0;

  if (isFull) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <ErrorState
            title="Cohort Full"
            description="This cohort has reached its maximum capacity."
          />
          <div className="mt-4">
            <Button asChild>
              <a href="/courses">Browse Other Courses</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/cohort/${cohortId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cohort
          </Button>
          <h1 className="text-3xl font-bold mb-2">Complete Your Enrollment</h1>
          <p className="text-muted-foreground">
            You're just one step away from joining this cohort
          </p>
        </div>

        <div className="grid gap-6">
          {/* Cohort Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {cohort.name}
                  </h3>
                  {cohort.description && (
                    <p className="text-muted-foreground text-sm mb-4">
                      {cohort.description}
                    </p>
                  )}
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>Start Date: {formatDate(cohort.startDate)}</p>
                    <p>Duration: {cohort.weeklySchedule.length} weeks</p>
                    <p>Live Sessions: {cohort.liveSessionSchedule.length}</p>
                    <p>Available Spots: {spotsLeft}</p>
                  </div>
                  {pricing && !loadingPricing ? (
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {pricing.formattedPrice}
                      </div>
                      {pricing.originalCurrency !== pricing.currency && (
                        <div className="text-sm text-muted-foreground">
                          Original: {formatPrice(pricing.originalAmount, pricing.originalCurrency)}
                          (Rate: {pricing.exchangeRate.toFixed(4)})
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
                  onClick={() => {
                    setSelectedProvider(provider.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedProvider === provider.id
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      />
                      <div>
                        <span className="font-medium">
                          {provider.displayName}
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

          {/* Security Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Secure Payment</h4>
                  <p className="text-sm text-muted-foreground">
                    Your payment information is encrypted and secure. We never
                    store your payment details. All transactions are recorded
                    and can be viewed in your account.
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
  );
}