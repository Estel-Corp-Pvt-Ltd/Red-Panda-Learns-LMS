import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useBundleQuery, useBundleCoursesQuery } from '@/hooks/useBundleApi';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { paymentService } from '@/services/paymentService';
import { ArrowLeft, CreditCard, DollarSign, Package, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/utils/logger';

type PaymentProvider = 'razorpay' | 'paypal';

export default function BundleCheckoutPage() {
  const { toast } = useToast();
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshEnrollments } = useEnrollment();
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: bundle, isLoading, isError, error } = useBundleQuery(bundleId!);
  const { data: courses, isLoading: coursesLoading } = useBundleCoursesQuery(bundleId!);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  if (isLoading || coursesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <LoadingSkeleton variant="card" />
        </main>
      </div>
    );
  }

  if (isError || !bundle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <ErrorState
            error={error as Error}
            onRetry={() => window.location.reload()}
            className="my-12"
          />
        </main>
      </div>
    );
  }

  const handlePayment = async () => {
    if (!user || !bundle) return;

    setIsProcessing(true);

    try {
      logError('Processing bundle payment:', {
        bundleId: bundle.id,
        provider: selectedProvider,
        userEmail: user.email
      });

      const result = await paymentService.processBundlePayment(
        selectedProvider,
        bundle,
        user.email!,
        user.uid
      );

      if (result.success) {
        // Refresh enrollment status
        await refreshEnrollments();

        toast.success('Payment successful! Welcome to your new courses!');
        navigate(`/bundle/${bundleId}/dashboard`);
      } else {
        toast({ title: result.error || 'Payment failed. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      logError('Payment error:', error);
      toast({ title: 'Payment failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8 max-w-4xl">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate(`/bundle/${bundleId}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bundle
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Bundle Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{bundle.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {bundle.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Courses included:</span>
                    <Badge variant="secondary">{bundle.totalCourses} courses</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Original price:</span>
                    <span className="text-sm line-through text-muted-foreground">
                      ${(bundle.originalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your savings:</span>
                    <span className="text-sm text-success font-medium">
                      -${((bundle.originalPrice - bundle.bundlePrice) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${(bundle.bundlePrice / 100).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Course List */}
            {courses && courses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Included Courses</CardTitle>
                  <CardDescription>
                    You'll get access to all of these courses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courses.slice(0, 5).map((course) => (
                      <div key={course.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <div>
                          <p className="font-medium text-sm">{course.title || course.post_title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {course.description}
                          </p>
                        </div>
                      </div>
                    ))}
                    {courses.length > 5 && (
                      <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground">
                          +{courses.length - 5} more courses
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </CardTitle>
                <CardDescription>
                  Choose your preferred payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup
                  value={selectedProvider}
                  onValueChange={(value) => setSelectedProvider(value as PaymentProvider)}
                >
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="razorpay" id="razorpay" />
                    <Label htmlFor="razorpay" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Razorpay</p>
                          <p className="text-sm text-muted-foreground">Cards, UPI, Wallets & More</p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-sm text-muted-foreground">Pay with PayPal account</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Instant access after payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Lifetime access to courses</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    `Complete Purchase - $${(bundle.bundlePrice / 100).toFixed(2)}`
                  )}
                </Button>

                {selectedProvider === 'razorpay' && (
                  <div id="razorpay-button-container" className="mt-4"></div>
                )}

                {selectedProvider === 'paypal' && (
                  <div id="paypal-button-container" className="mt-4"></div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
