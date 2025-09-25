import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

import { couponService } from '@/services/couponService';
import { CouponStatus } from '@/types/coupon.';
import { courseService } from '@/services/courseService';
import { useCouponByCodeQuery } from '@/hooks/useCouponApi';
const createCouponSchema = z.object({
  code: z.string().min(3, 'Coupon code is required'),
  discountPercentage: z.number().min(1).max(100, '1–100% allowed'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  usageLimit: z.number().min(1, 'At least 1 usage allowed'),
  linkedCourseIds: z.array(z.string()).optional(), // allow empty array
  status: z.nativeEnum(CouponStatus),
});

type CreateCouponFormData = z.infer<typeof createCouponSchema>;

export default function CreateCouponPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // Load courses to link
  const loadCourses = async () => {
    try {
      const coursesList = await courseService.getAllCourses();
      setCourses(coursesList.map(course => ({ id: course.id, title: course.title })));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load courses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCouponFormData>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      status: CouponStatus.ACTIVE,
      linkedCourseIds: [],
    },
  });

  const codeValue = watch('code');
  const { data: existingCoupon } = useCouponByCodeQuery(codeValue?.trim());

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
        expiryDate: Timestamp.fromDate(new Date(data.expiryDate)),
        usageLimit: data.usageLimit,
        linkedCourseIds: selectedCourses,
        status: data.status,
        createdById: 'admin_user_id', // Replace with real ID from auth
      };

      await couponService.createCoupon(couponData);

      toast({
        title: 'Coupon Created',
        description: `Coupon "${data.code}" was created successfully.`,
      });

      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to create coupon.',
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Coupon</CardTitle>
          <CardDescription>Create a new discount coupon and link it to specific courses.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Coupon Code */}
            <div>
              <Label>Coupon Code</Label>
              <Input {...register('code')} placeholder="e.g. SAVE50" />
              {existingCoupon && (
                <p className="text-sm text-red-500">
                  This code is already in use.
                </p>
              )}
              {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
            </div>

            {/* Discount % */}
            <div>
              <Label>Discount Percentage</Label>
              <Input type="number" {...register('discountPercentage', { valueAsNumber: true })} />
              {errors.discountPercentage && <p className="text-sm text-red-500">{errors.discountPercentage.message}</p>}
            </div>

            {/* Expiry */}
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" {...register('expiryDate')} />
              {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate.message}</p>}
            </div>

            {/* Usage Limit */}
            <div>
              <Label>Usage Limit</Label>
              <Input type="number" {...register('usageLimit', { valueAsNumber: true })} />
              {errors.usageLimit && <p className="text-sm text-red-500">{errors.usageLimit.message}</p>}
            </div>

            {/* Select Courses */}
            <div>
              <Label>Select Courses to Link</Label>
              {loading ? (
                <p className="text-sm text-muted">Loading courses...</p>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted">No courses available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border p-2 rounded-md">
                  {courses.map(course => (
                    <label key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => toggleCourseSelection(course.id)}
                      />
                      <span className="text-sm">{course.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select
                defaultValue={CouponStatus.ACTIVE}
                onValueChange={(val) => setValue('status', val as CouponStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CouponStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={CouponStatus.INACTIVE}>Inactive</SelectItem>
                  <SelectItem value={CouponStatus.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting || !!existingCoupon}>
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
