import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { toDateSafe } from "@/utils/date-time";
import { couponService } from "@/services/couponService";
import { CouponStatus } from "@/types/general";
import { courseService } from "@/services/courseService";
import { cohortService } from "@/services/cohortService";
import { bundleService } from "@/services/bundleService";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";

import { useCouponByCodeQuery } from "@/hooks/useCouponApi";
import { COUPON_STATUS } from "@/constants";

const createCouponSchema = z.object({
  code: z.string().min(3, "Coupon code is required"),
  discountPercentage: z.number().min(1).max(100, "1–100% allowed"),
  expiryDate: z
    .string()
    .min(1, "Expiry date is required")
    .refine((val) => {
      const date = toDateSafe(val);
      if (!date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, "Expiry date cannot be in the past"),
  usageLimit: z.number().min(0, "At least 1 usage allowed"),
  linkedCourseIds: z.array(z.string()).optional(),
  status: z.nativeEnum(COUPON_STATUS),
});

type CreateCouponFormData = z.infer<typeof createCouponSchema>;

export default function CreateCouponPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [cohorts, setCohorts] = useState<{ id: string; title: string }[]>([]);
  const [bundles, setBundles] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);

  // Load courses to link
  const loadCourses = async () => {
    try {
      const coursesList = await courseService.getAllCourses();
      setCourses(
        coursesList.map((course) => ({ id: course.id, title: course.title }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCohorts = async () => {
    try {
      const cohortList = await cohortService.getAllCohorts();
      setCohorts(
        cohortList.map((cohort) => ({ id: cohort.id, title: cohort.title }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed To Load Cohort",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBundels = async () => {
    try {
      const bundleList = await bundleService.getAllBundles();
      setBundles(
        bundleList.map((bundle) => ({ id: bundle.id, title: bundle.title }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Error Loading Bundle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    loadBundels();
    loadCohorts();
  }, []);

  const { user } = useAuth();

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

  const codeValue = watch("code");
  const { data: existingCoupon } = useCouponByCodeQuery(codeValue?.trim());

  const onSubmit = async (data: CreateCouponFormData) => {
    if (existingCoupon) {
      toast({
        title: "Duplicate Coupon Code",
        description: `Coupon code "${codeValue}" is already in use.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const date = toDateSafe(data.expiryDate);
      const couponData = {
        code: data.code.trim(),
        discountPercentage: data.discountPercentage,
        expiryDate: date ? Timestamp.fromDate(date) : null,
        usageLimit: data.usageLimit,
        linkedCourseIds: selectedCourses,
        linkedBundleIds: selectedBundles,
        linkedCohortIds: selectedCohorts,
        status: data.status,
        createdById: user?.id,
        createdbyMail: user?.email,
      };

      await couponService.createCoupon(couponData);
      toast({
        title: "Coupon Created",
        description: `Coupon "${data.code}" was created successfully.`,
      });

      navigate("/admin");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to create coupon.",
        variant: "destructive",
      });
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleCohortSelection = (cohortId: string) => {
    setSelectedCohorts((prev) =>
      prev.includes(cohortId)
        ? prev.filter((id) => id !== cohortId)
        : [...prev, cohortId]
    );
  };

  const toggleBundleSelection = (bundleId: string) => {
    setSelectedBundles((prev) =>
      prev.includes(bundleId)
        ? prev.filter((id) => id !== bundleId)
        : [...prev, bundleId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Website header */}
      <Header />

      {/* Top bar like Create Bundle: Back and Title */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Create Coupon
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Coupon</CardTitle>
              <CardDescription>
                Create a new discount coupon and link it to specific courses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Coupon Code */}
                <div>
                  <Label>Coupon Code</Label>
                  <Input {...register("code")} placeholder="e.g. SAVE50" />
                  {existingCoupon && (
                    <p className="text-sm text-red-500">
                      This code is already in use.
                    </p>
                  )}
                  {errors.code && (
                    <p className="text-sm text-red-500">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                {/* Discount % */}
                <div>
                  <Label>Discount Percentage</Label>
                  <Input
                    type="number"
                    {...register("discountPercentage", { valueAsNumber: true })}
                  />
                  {errors.discountPercentage && (
                    <p className="text-sm text-red-500">
                      {errors.discountPercentage.message}
                    </p>
                  )}
                </div>

                {/* Expiry */}
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" {...register("expiryDate")} />
                  {errors.expiryDate && (
                    <p className="text-sm text-red-500">
                      {errors.expiryDate.message}
                    </p>
                  )}
                </div>

                {/* Usage Limit */}
                <div>
                  <Label>Usage Limit</Label>
                  <Input
                    type="number"
                    {...register("usageLimit", { valueAsNumber: true })}
                  />
                  {errors.usageLimit && (
                    <p className="text-sm text-red-500">
                      {errors.usageLimit.message}
                    </p>
                  )}
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
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={() =>
                              toggleCourseSelection(course.id)
                            }
                          />
                          <span className="text-sm">{course.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Select Cohorts */}
                <div>
                  <Label>Select cohort to Link</Label>
                  {loading ? (
                    <p className="text-sm text-muted">Loading cohort...</p>
                  ) : cohorts.length === 0 ? (
                    <p className="text-sm text-muted">No cohort available.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border p-2 rounded-md">
                      {cohorts.map((course) => (
                        <label
                          key={course.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={selectedCohorts.includes(course.id)}
                            onCheckedChange={() =>
                              toggleCohortSelection(course.id)
                            }
                          />
                          <span className="text-sm">{course.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Select Bundle */}
                <div>
                  <Label>Select bundle to Link</Label>
                  {loading ? (
                    <p className="text-sm text-muted">Loading bundle...</p>
                  ) : bundles.length === 0 ? (
                    <p className="text-sm text-muted">No bundle available.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border p-2 rounded-md">
                      {bundles.map((bundle) => (
                        <label
                          key={bundle.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={selectedBundles.includes(bundle.id)}
                            onCheckedChange={() =>
                              toggleBundleSelection(bundle.id)
                            }
                          />
                          <span className="text-sm">{bundle.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <Select
                    defaultValue={COUPON_STATUS.ACTIVE}
                    onValueChange={(val) =>
                      setValue("status", val as CouponStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={COUPON_STATUS.ACTIVE}>
                        Active
                      </SelectItem>
                      <SelectItem value={COUPON_STATUS.INACTIVE}>
                        Inactive
                      </SelectItem>
                      <SelectItem value={COUPON_STATUS.EXPIRED}>
                        Expired
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-sm text-red-500">
                      {errors.status.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !!existingCoupon}
                >
                  {isSubmitting ? "Creating..." : "Create Coupon"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
