import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { COUPON_STATUS } from '@/constants';
import { bundleService } from '@/services/bundleService';
import { couponService } from '@/services/couponService';
import { courseService } from '@/services/courseService';
import { Coupon } from '@/types/coupon';
import { CouponStatus } from '@/types/general';
import { toDateSafe } from '@/utils/date-time';
import { logError } from '@/utils/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { Timestamp } from 'firebase/firestore';
import { AlertCircle, Calendar, Hash, Package, Percent, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

const createCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code is required'),
  discountPercentage: z.number().min(1).max(100, '1–100% allowed'),
  expiryDate: z.string()
    .min(1, "Expiry date is required")
    .refine((val) => {
      const date = toDateSafe(val);
      if (!date) return false; // Invalid date string
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today; // No past dates
    }, "Expiry date cannot be in the past"),
  usageLimit: z.number().min(0, 'At least 1 usage allowed'),
  linkedCourseIds: z.array(z.string()).optional(),
  status: z.nativeEnum(COUPON_STATUS),
});

type CreateCouponFormData = z.infer<typeof createCouponSchema>;

export default function EditCouponPage() {
  const navigate = useNavigate();
  const { couponId } = useParams<{ couponId: string }>();
  const { toast } = useToast();

  const [courseSearch, setCourseSearch] = useState("");

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [bundles, setBundles] = useState<{ id: string; title: string }[]>([]);
  const [currentCoupon, setCurrentCoupon] = useState<CreateCouponFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);

  // Load courses and bundles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesList, bundlesList] = await Promise.all([
          courseService.getAllCourses(),
          bundleService.getAllBundles(),
        ]);

        setCourses(coursesList.map(course => ({ id: course.id, title: course.title })));
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

  const filteredCourses = (() => {
    if (!courseSearch.trim()) return courses;

    try {
      const regex = new RegExp(courseSearch.trim(), "i");
      return courses.filter(c => regex.test(c.title));
    } catch (error) {
      return courses;
    }
  })();

  const selectedCourseObjects = selectedCourses
    .map(id => courses.find(c => c.id === id))
    .filter(Boolean) as { id: string; title: string }[];

  useEffect(() => {
    if (!couponId) return;

    const loadCoupon = async () => {
      try {
        const couponDate = await couponService.getCouponById(couponId);
        const coupon = couponDate.data
        if (!coupon) {
          toast({
            title: 'Error',
            description: 'Coupon not found',
            variant: 'destructive',
          });
          navigate('/admin');
          return;
        }

        // Convert Firestore Timestamp → string for form state
        setCurrentCoupon({
          code: coupon.code,
          discountPercentage: coupon.discountPercentage,
          expiryDate: (() => {
            const d = toDateSafe(coupon.expiryDate);
            return d ? d.toISOString().split('T')[0] : '';
          })(),
          usageLimit: coupon.usageLimit,
          status: coupon.status,
          linkedCourseIds: coupon.linkedCourseIds || [],
        });

        // Set initial selections
        setSelectedCourses(coupon.linkedCourseIds || []);
        setSelectedBundles(coupon.linkedBundleIds || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load coupon',
          variant: 'destructive',
        });

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
        const allCouponsResult = await couponService.getAllCoupons();

        const duplicate = allCouponsResult.success
          ? allCouponsResult.data?.find(
            (c) => c.code === codeValue.trim() && c.id !== couponId
          )
          : null;

        setExistingCoupon(duplicate || null);
      } catch (error: any) {
        logError("CheckDuplicateCoupon", error);
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
      const date = toDateSafe(data.expiryDate);
      const couponData = {
        code: data.code.trim(),
        discountPercentage: data.discountPercentage,
        expiryDate: date ? Timestamp.fromDate(date) : null,
        // expiryDate: Timestamp.fromDate(new Date(data.expiryDate)),
        usageLimit: data.usageLimit,
        linkedCourseIds: selectedCourses,
        linkedBundleIds: selectedBundles,
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Select Courses to Link
                </Label>

                <div className="mb-2">
                  <Input
                    placeholder="Search Courses"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>

                {selectedCourseObjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedCourseObjects.map(course => (
                      <div
                        key={course.id}
                        className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded-md text-sm"
                      >
                        <span>{course.title}</span>

                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => toggleCourseSelection(course.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {loading ? (
                  <p className="text-sm">Loading courses...</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-sm">No courses available.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-auto border p-3 rounded-md">
                    {filteredCourses.map(course => (
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Select Bundles to Link
                </Label>
                {loading ? (
                  <p className="text-sm">Loading bundles...</p>
                ) : bundles.length === 0 ? (
                  <p className="text-sm">No bundles available.</p>
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