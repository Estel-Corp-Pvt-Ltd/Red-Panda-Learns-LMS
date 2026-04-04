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

import { useEnrollment } from '@/contexts/EnrollmentContext';
import { paymentService } from '@/services/paymentService';
import { ArrowLeft, CreditCard, DollarSign, Package, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { couponUsageService } from '@/services/couponUsageService';
import { couponService } from '@/services/couponService'; // Assuming this is exported
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/utils/logger';
type PaymentProvider = 'razorpay';

export default function DummyBundleCheckoutPage() {
  const { toast } = useToast();
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();

  const { refreshEnrollments } = useEnrollment();
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: bundle, isLoading, isError, error } = useBundleQuery(bundleId!);
  const { data: courses, isLoading: coursesLoading } = useBundleCoursesQuery(bundleId!);
  const [promoCode, setPromoCode] = useState('');
  const [isCouponValid, setIsCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const { user } = useAuth();
  const [CouponKiId, setCouponKiId] = useState("");



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

      const result = await paymentService.processBundlePayment(
        selectedProvider,
        bundle,
        user?.email,
        user?.id
      );

      if (result.success) {
        // Refresh enrollment status
        await refreshEnrollments();

        toast({ title: 'Payment successful! Welcome to your new courses!' });
        navigate(`/bundle/${bundleId}/dashboard`);
      } else {
        toast({ title: result.error || 'Payment failed. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: 'Payment failed. Please try again.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };



  const handleApplyCoupon = async () => {
    // setIsValidatingCoupon(true);
    setCouponMessage('');
    // setIsCouponValid(false);
    setDiscountAmount(0);
    setAppliedCouponId(null);

    try {
      const couponcode = promoCode.trim();
      // const result = await couponUsageService.isCouponApplicable(couponId, undefined, bundleId);

      // if (!result.isApplicable) {
      //   setCouponMessage(result.reason || 'Coupon is not valid');
      //   return;
      // }



      // console.log(couponcode)
      const coupon = await couponService.getCouponByCode(couponcode);
      const CouponKiId = setCouponKiId(coupon.id)
      const applydiscount = async () => {
        try {
          const afterDiscount = (bundle.regularPrice - ((bundle.regularPrice * coupon.discountPercentage) / 100))
          setDiscountAmount(afterDiscount)
        } catch (error) {
          logError('The Error is ', error)
        }
      }
      const applydiscount1 = await applydiscount()
      if (!coupon) {
        setCouponMessage('Coupon not found');
        return;
      }
      else {
        setCouponMessage('Coupon Is Valid')
      }
      // console.log("This is bundle id stored in coupon>" ,coupon.linkedBundleIds,"<and this bundel id",bundle.id)
      // console.log("yoo>",bundle.id.trim(),"<")
      // console.log("yoo>",coupon.linkedBundleIds,"<")
      const bundelIDCheck = coupon.linkedBundleIds
      // Check if user already used the coupon (optional, based on business rules)
      const alreadyUsed = await couponUsageService.hasUserUsedCoupon(user?.id, coupon.id);
      const couponcount = await couponUsageService.getUsageCountByCoupon(coupon.id)
      const couponusedbyuser = await couponService.getCouponUsagesByUser(user?.id)
      const isApplicable = await couponUsageService.isCouponApplicable(coupon.id, null, bundle.id, null)
      // console.log(isApplicable)
      // console.log("THis is how much user has used",couponusedbyuser)
      if (alreadyUsed) {
        setCouponMessage('You have already used this coupon.');
        return;
      }
      else {
        setCouponMessage(`Pehle Pehla Coupon Hai and the total coupon count is --> ${couponcount} and here is how many user used ${couponusedbyuser}`)
      }

      // Apply discount
      //   const discount = coupon.discountPercentage; // assuming fixed amount in cents
      //   setDiscountAmount(discount);
      //   setIsCouponValid(true);
      //   setCouponMessage(`Coupon applied! You saved $${(discount / 100).toFixed(2)}.`);
      //   setAppliedCouponId(couponId);
      // } catch (err) {
      //   console.error(err);
      //   setCouponMessage('Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }

  };


  const handleUseCouponTest = async () => {
    try {
      const usageDate = {
        userId: user?.id,
        couponId: CouponKiId,
        bundleId: bundle.id,
        usedAt: Timestamp.now()
      }
      await couponUsageService.recordCouponUsage(usageDate)
    }
    catch (error) {
      logError("Coupon recording error", error)
    }
  }

  // useEffect(() => {
  //   if (!bundle) return;

  //   if (discountAmount > 0) {
  //     setFinalPrice(discountAmount);
  //   } else {
  //     setFinalPrice(bundle.regularPrice);
  //   }
  // }, [discountAmount, bundle]);




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
                      ${(bundle.regularPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your savings:</span>
                    <span className="text-sm text-success font-medium">
                      ${((bundle.regularPrice - bundle.salePrice))}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${((bundle.regularPrice - bundle.salePrice))}
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

                <span className="text-2xl font-bold text-primary">
                  ${finalPrice} -- This is Finale Price
                </span>

                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    `Complete Purchase -> $${finalPrice}`
                  )}
                </Button>

                {selectedProvider === 'razorpay' && (
                  <div id="razorpay-button-container" className="mt-4"></div>
                )}




                <div className="space-y-2">
                  <Label htmlFor="promoCode">Have a promo code?</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promoCode"
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={isValidatingCoupon || isProcessing}
                    />
                    <Button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!promoCode || isValidatingCoupon}
                    >
                      {isValidatingCoupon ? 'Checking...' : 'Apply'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUseCouponTest}

                    >
                      {"Use Coupon Test"}
                    </Button>
                  </div>
                  {couponMessage && (
                    <p className={`text-sm ${isCouponValid ? 'text-success' : 'text-destructive'}`}>
                      {couponMessage}
                    </p>
                  )}
                </div>

              </CardContent>


              {/* Promo Code Section */}


            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
