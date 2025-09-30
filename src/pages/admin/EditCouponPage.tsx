import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Percent, Calendar, Hash, Package, Users, Tag, AlertCircle } from 'lucide-react';
import { couponService } from '@/services/couponService';
import { courseService } from '@/services/courseService';
import { cohortService } from '@/services/cohortService';
import { bundleService } from '@/services/bundleService';
import { Header } from '@/components/Header';
import { COUPON_STATUS } from '@/constants';
import { Coupon } from '@/types/coupon';
import { CouponStatus } from '@/types/general';

const createCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code is required'),
  discountPercentage: z.number().min(1).max(100, '1–100% allowed'),
  expiryDate: z.date(), // TODO: extra validation required 
  usageLimit: z.number().min(1, 'At least 1 usage allowed'),
  linkedCourseIds: z.array(z.string()).optional(),
  status: z.nativeEnum(COUPON_STATUS),
});

type CreateCouponFormData = z.infer<typeof createCouponSchema>;

export default function EditCouponPage() {
  const navigate = useNavigate();
  const { couponId } = useParams<{ couponId: string }>();
  const { toast } = useToast();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; title: string }[]>([]);
  const [bundles, setBundles] = useState<{ id: string; title: string }[]>([]);
  const [currentCoupon, setCurrentCoupon] = useState<CreateCouponFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);

  // Load courses, cohorts, and bundles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesList, cohortsList, bundlesList] = await Promise.all([
          courseService.getAllCourses(),
          cohortService.getAllCohorts(),
          bundleService.getAllBundles(),
        ]);

        setCourses(coursesList.map(course => ({ id: course.id, title: course.title })));
        setCohorts(cohortsList.map(cohort => ({ id: cohort.id, title: cohort.title })));
        setBundles(bundlesList.map(bundle => ({ id: bundle.id, title: bundle.title })));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load resources',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load current coupon data
  useEffect(() => {
    if (!couponId) return;

    const loadCoupon = async () => {
      try {
        const coupon = await couponService.getCouponById(couponId);
        if (!coupon) {
          toast({
            title: 'Error',
            description: 'Coupon not found',
            variant: 'destructive',
          });
          navigate('/admin');
          return;
        }

        setCurrentCoupon(coupon);

        // Set initial selections
        setSelectedCourses(coupon.linkedCourseIds || []);
        setSelectedCohorts(coupon.linkedCohortIds || []);
        setSelectedBundles(coupon.linkedBundleIds || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load coupon',
          variant: 'destructive',
        });
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    };

    loadCoupon();
  }, [couponId, navigate, toast]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCouponFormData>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      status: COUPON_STATUS.ACTIVE,
      linkedCourseIds: [],
    },
  });

  const codeValue = watch('code');
  const [existingCoupon, setExistingCoupon] = useState<Coupon | null>(null);

  // Check for duplicate coupon codes (excluding current coupon)
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!codeValue?.trim()) {
        setExistingCoupon(null);
        return;
      }

      try {
        const allCoupons = await couponService.getAllCoupons();
        const duplicate = allCoupons.find(c =>
          c.code === codeValue.trim() && c.id !== couponId
        );
        setExistingCoupon(duplicate || null);
      } catch (error) {
        console.error('Error checking duplicate coupon:', error);
        setExistingCoupon(null);
      }
    };

    checkDuplicate();
  }, [codeValue, couponId]);

  useEffect(() => {
    if (currentCoupon) {
      // Set form values from current coupon
      setValue('code', currentCoupon.code);
      setValue('discountPercentage', currentCoupon.discountPercentage);
      const expiryDate = currentCoupon.expiryDate;
      setValue('expiryDate',
        // TODO: fix expiryDate type issues throughout
        expiryDate
        // expiryDate.toISOString().split('T')[0]
      );
      setValue('usageLimit', currentCoupon.usageLimit);
      setValue('status', currentCoupon.status);
    }
  }, [currentCoupon, setValue]);

  const onSubmit = async (data: CreateCouponFormData) => {
    if (existingCoupon) {
      toast({
        title: 'Duplicate Coupon Code',
        description: `Coupon code "${codeValue}" is already in use.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const couponData = {
        code: data.code.trim(),
        discountPercentage: data.discountPercentage,
        expiryDate: new Date(data.expiryDate),
        // expiryDate: Timestamp.fromDate(new Date(data.expiryDate)),
        usageLimit: data.usageLimit,
        linkedCourseIds: selectedCourses,
        linkedBundleIds: selectedBundles,
        linkedCohortIds: selectedCohorts,
        status: data.status,
      };

      await couponService.updateCoupon(couponId, couponData);
      toast({
        title: 'Coupon Updated',
        description: `Coupon "${data.code}" was updated successfully.`,
      });
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to update coupon.',
        variant: 'destructive',
      });
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleCohortSelection = (cohortId: string) => {
    setSelectedCohorts(prev =>
      prev.includes(cohortId)
        ? prev.filter(id => id !== cohortId)
        : [...prev, cohortId]
    );
  };

  const toggleBundleSelection = (bundleId: string) => {
    setSelectedBundles(prev =>
      prev.includes(bundleId)
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  };

  if (loading) {
    return (

      <div className="max-w-2xl mx-auto p-6">

        <Card>
          <CardContent>
            <p className="text-center text-muted-foreground">Loading coupon data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentCoupon) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Header />
        <Card>
          <CardContent>
            <p className="text-center text-red-500">Coupon not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col'>
      <Header />
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">

        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Edit Coupon</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Update details for coupon "{currentCoupon.code}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Coupon Code */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Coupon Code
                </Label>
                <Input {...register('code')} placeholder="e.g. SAVE50" />
                {existingCoupon && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This code is already in use.
                  </p>
                )}
                {errors.code && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* Discount % */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Discount Percentage
                </Label>
                <Input
                  type="number"
                  {...register('discountPercentage', { valueAsNumber: true })}
                  className="w-full"
                />
                {errors.discountPercentage && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.discountPercentage.message}
                  </p>
                )}
              </div>

              {/* Expiry */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiry Date
                </Label>
                <Input
                  type="date"
                  {...register('expiryDate')}
                  className="w-full"
                />
                {errors.expiryDate && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.expiryDate.message}
                  </p>
                )}
              </div>

              {/* Usage Limit */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Usage Limit
                </Label>
                <Input
                  type="number"
                  {...register('usageLimit', { valueAsNumber: true })}
                  className="w-full"
                />
                {errors.usageLimit && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.usageLimit.message}
                  </p>
                )}
              </div>

              {/* Select Courses */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Select Courses to Link
                </Label>
                {loading ? (
                  <p className="text-sm text-muted">Loading courses...</p>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-muted">No courses available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border p-3 rounded-md">
                    {courses.map(course => (
                      <label key={course.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox
                          checked={selectedCourses.includes(course.id)}
                          onCheckedChange={() => toggleCourseSelection(course.id)}
                        />
                        <span className="text-sm truncate">{course.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Select Cohorts */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Select Cohorts to Link
                </Label>
                {loading ? (
                  <p className="text-sm text-muted">Loading cohorts...</p>
                ) : cohorts.length === 0 ? (
                  <p className="text-sm text-muted">No cohorts available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border p-3 rounded-md">
                    {cohorts.map(cohort => (
                      <label key={cohort.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox
                          checked={selectedCohorts.includes(cohort.id)}
                          onCheckedChange={() => toggleCohortSelection(cohort.id)}
                        />
                        <span className="text-sm truncate">{cohort.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Select Bundle */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Select Bundles to Link
                </Label>
                {loading ? (
                  <p className="text-sm text-muted">Loading bundles...</p>
                ) : bundles.length === 0 ? (
                  <p className="text-sm text-muted">No bundles available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border p-3 rounded-md">
                    {bundles.map(bundle => (
                      <label key={bundle.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                        <Checkbox
                          checked={selectedBundles.includes(bundle.id)}
                          onCheckedChange={() => toggleBundleSelection(bundle.id)}
                        />
                        <span className="text-sm truncate">{bundle.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  defaultValue={currentCoupon.status}
                  onValueChange={(val) => setValue('status', val as CouponStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COUPON_STATUS.ACTIVE}>Active</SelectItem>
                    <SelectItem value={COUPON_STATUS.INACTIVE}>Inactive</SelectItem>
                    <SelectItem value={COUPON_STATUS.EXPIRED}>Expired</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.status.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !!existingCoupon}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}