import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useBundleQuery, useBundleCoursesQuery } from "@/hooks/useBundleApi";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Star,
  IndianRupee,
} from "lucide-react";
import CourseCard from "@/components/course/CourseCard";
import { ENROLLED_PROGRAM_TYPE, PRICING_MODEL } from "@/constants";
import { ok, fail, type Result } from "@/utils/response";
import { logError } from "@/utils/logger";
import { cn } from "@/lib/utils";

export default function BundleDetailPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enrollments, isEnrolledInBundle, loading } = useEnrollment();

  const { data: bundle, isLoading, isError, error } = useBundleQuery(bundleId!);
  const {
    data: courses,
    isLoading: coursesLoading,
    isError: coursesError,
  } = useBundleCoursesQuery(bundleId!);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [ownedCoursesCount, setOwnedCoursesCount] = useState(0);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [ownsAllCourses, setOwnsAllCourses] = useState(false);

  useEffect(() => {
    const checkEnrollment = async () => {
      try {
        if (!user || !bundle) return;

        // 1️⃣ Check if user directly enrolled in the bundle
        const enrolledInBundle = await isEnrolledInBundle(bundle.id);

        // 2️⃣ Compute all courses owned (direct + via bundles)
        const directCourses =
          enrollments?.filter(
            (e) => e.targetType === ENROLLED_PROGRAM_TYPE.COURSE,
          ) || [];

        const bundleCourses =
          enrollments
            ?.filter((e) => e.targetType === ENROLLED_PROGRAM_TYPE.BUNDLE)
            .flatMap((bundleEnrollment) => {
              if (!bundleEnrollment.bundleProgress) return [];
              return bundleEnrollment.bundleProgress.map((bp) => ({
                id: `${bundleEnrollment.id}_${bp.courseId}_virtual`,
                userId: bundleEnrollment.userId,
                targetId: bp.courseId,
                targetType: ENROLLED_PROGRAM_TYPE.COURSE,
                status: bundleEnrollment.status,
                sourceBundleId: bundleEnrollment.targetId,
                pricingModel:
                  bundleEnrollment.pricingModel || PRICING_MODEL.PAID,
                enrollmentDate: bundleEnrollment.enrollmentDate,
                createdAt: bundleEnrollment.createdAt,
                updatedAt: bundleEnrollment.updatedAt,
                progressSummary: {
                  percent: 0,
                  completedCourses: 0,
                  totalCourses: 1,
                },
              }));
            }) || [];

        const allOwnedCourses = [...directCourses, ...bundleCourses];
        const userCourseIds = allOwnedCourses.map((e) => e.targetId);

        // 3️⃣ Compare with current bundle courses
        const totalCourses = bundle.courses?.length || 0;
        const ownedCourses =
          bundle.courses?.filter((c) => userCourseIds.includes(c.id)) || [];

        const ownsAll = ownedCourses.length === totalCourses;

        // 4️⃣ Update state
        setOwnedCoursesCount(ownedCourses.length);
        setOwnsAllCourses(ownsAll);
        setIsEnrolled(enrolledInBundle);
        setEnrollmentChecked(true);

        const result: Result<boolean> = ok(enrolledInBundle);
        console.log("✅ Enrollment check:", result);
      } catch (err) {
        logError("BundleDetailPage.checkEnrollment", err);
        const failResult = fail(
          err instanceof Error ? err.message : "Unknown enrollment error",
        );
        console.warn("BundleDetailPage - Enrollment failed:", {
          bundleId: bundle?.id,
          failResult,
        });
      }
    };

    checkEnrollment();
  }, [user, bundle, enrollments, isEnrolledInBundle]);

  const handleEnrollment = () => {
    if (isEnrolled) {
      navigate(`/bundle/${bundleId}/dashboard`);
    } else {
      navigate(`/bundle/${bundleId}/checkout`);
    }
  };

  if (isLoading || coursesLoading || loading || !enrollmentChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <LoadingSkeleton variant="card" />
        </main>
      </div>
    );
  }

  if (isError || coursesError || !bundle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState
            error={error as Error}
            onRetry={() => window.location.reload()}
            className="my-12"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate("/courses")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        {/* Bundle Header */}
        <div className="rounded-2xl p-8 md:p-12 mb-12 border">
          <div className="max-w-4xl space-y-6">
            {/* Categories & Tags */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Bundle</Badge>
              {bundle.categories.map((category) => (
                <Badge key={category} variant="outline">
                  {category}
                </Badge>
              ))}
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">
                {bundle.title}
              </h1>
              <p className="text-lg text-gray-700">{bundle.description}</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span>{bundle.courses.length} Courses</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                <span>
                  Save {(bundle.regularPrice - bundle.salePrice).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <span>Expert Instructors</span>
              </div>
            </div>

            {/* Pricing + CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-3">
                  <div className="text-3xl font-bold">
                    ₹{bundle.salePrice.toFixed(2)}
                  </div>
                  <div className="text-lg line-through text-gray-500">
                    ₹{bundle.regularPrice.toFixed(2)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="mt-2 self-start text-green-600 border-green-600"
                >
                  Save{" "}
                  {Math.round(
                    ((bundle.regularPrice - bundle.salePrice) /
                      bundle.regularPrice) *
                      100,
                  )}
                  %
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:ml-auto gap-3">
                {ownedCoursesCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-900 font-semibold border border-blue-300 hover:bg-blue-200"
                  >
                    You already own <strong>{ownedCoursesCount}</strong> of{" "}
                    <strong>{bundle.courses.length}</strong> courses
                  </Badge>
                )}

                <Button
                  onClick={() => !ownsAllCourses && handleEnrollment()}
                  size="lg"
                  disabled={ownsAllCourses}
                  title={
                    ownsAllCourses
                      ? `You already own all courses in ${bundle.title} bundle`
                      : undefined
                  }
                  className={cn(
                    "w-full sm:w-auto text-white",
                    ownsAllCourses
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800",
                  )}
                >
                  {ownsAllCourses ? (
                    "All Courses Owned"
                  ) : isEnrolled ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Access Bundle
                    </>
                  ) : (
                    <>Buy Bundle for ₹{bundle.salePrice.toFixed(2)}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bundle Contents */}
        <div className="rounded-2xl p-8 md:p-12 mb-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Bundle Contents</h2>
              <p className="text-muted-foreground mb-6">
                This bundle includes {bundle.courses.length} comprehensive
                courses designed to give you a complete learning experience.
              </p>
            </div>

            {courses && courses.length > 0 ? (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="default"
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    No courses found in this bundle.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    What You'll Get
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Access to all {bundle.courses.length} courses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Lifetime access to course materials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>
                      Save ₹{bundle.regularPrice - bundle.salePrice} compared to
                      individual purchases
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Expert instructor support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Progress tracking across all courses</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-warning" />
                    Bundle Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Course bundles are designed to provide a comprehensive
                    learning path at a significant discount.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Individual Course Prices:</span>
                      <span className="font-medium">
                        ₹{bundle.salePrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bundle Price:</span>
                      <span className="font-medium text-success">
                        ₹{bundle.regularPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Your Savings:</span>
                      <span className="font-bold text-success">
                        ₹{bundle.regularPrice - bundle.salePrice}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
