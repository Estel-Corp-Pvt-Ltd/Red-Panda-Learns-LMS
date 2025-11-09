import CourseCard from "@/components/course/CourseCard";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ENROLLED_PROGRAM_TYPE, PRICING_MODEL } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useEnrollment } from "@/contexts/EnrollmentContext";
import { useBundleCoursesQuery, useBundleQuery } from "@/hooks/useBundleApi";
import { cn } from "@/lib/utils";
import { logError } from "@/utils/logger";
import { fail, ok, type Result } from "@/utils/response";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  IndianRupee,
  Play,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function BundleDetailPage() {
  const { param } = useParams<{ param: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enrollments, isEnrolledInBundle, loading } = useEnrollment();
  const [bundleId, setBundleId] = useState("")

  const {
    data: bundle,
    isLoading: bundleLoading,
    error: bundleError,
  } = useBundleQuery(param!);

  useEffect(() => {
    if (!param || bundleLoading || !bundle) return;
    setBundleId(bundle.id);
  }, [param, bundleLoading, bundle]);

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
    let cancelled = false;

    const checkEnrollment = async () => {
      try {
        if (!bundle) return;

        // If user isn't logged in, mark as checked so the page can render
        if (!user?.id) {
          if (!cancelled) {
            setIsEnrolled(false);
            setOwnedCoursesCount(0);
            setOwnsAllCourses(false);
            setEnrollmentChecked(true);
          }
          return;
        }

        // 1) Direct bundle enrollment (still useful if you track bundle license)
        const enrolledInBundle = await isEnrolledInBundle(bundle.id);
        if (cancelled) return;

        // 2) Owned courses from new schema: Enrollment.courseId
        // If enrollments already belong to the current user, you can skip the userId filter
        const userEnrollments = (enrollments ?? []).filter(e => e.userId === user.id);

        // Optional: filter by status if you need (uncomment and adjust)
        // const ACTIVE_STATUSES = new Set<EnrollmentStatus>(["ACTIVE", "COMPLETED"]);
        // const userEnrollments = (enrollments ?? [])
        //   .filter(e => e.userId === user.id && ACTIVE_STATUSES.has(e.status));

        const ownedCourseIds = new Set(userEnrollments.map(e => e.courseId));

        // 3) Compare to current bundle courses
        const totalCourses = bundle.courses?.length ?? 0;
        const ownedCount = (bundle.courses ?? []).filter(c => ownedCourseIds.has(c.id)).length;
        const ownsAll = totalCourses > 0 && ownedCount === totalCourses;

        // 4) Update state
        if (!cancelled) {
          setIsEnrolled(enrolledInBundle);
          setOwnedCoursesCount(ownedCount);
          setOwnsAllCourses(ownsAll);
          setEnrollmentChecked(true);
        }
      } catch (err) {
        logError("BundleDetailPage.checkEnrollment", err);
        if (!cancelled) {
          setEnrollmentChecked(true);
        }
      }
    };

    checkEnrollment();
    return () => { cancelled = true; };
  }, [user?.id, bundle?.id, bundle?.courses, enrollments, isEnrolledInBundle]);


  const handleEnrollment = () => {
    if (isEnrolled) {
      navigate(`/bundle/${bundle.id}/dashboard`);
    } else {
      navigate(`/course-bundle/${bundle.slug}/checkout`);
    }
  };

  if (bundleLoading || coursesLoading || loading || !enrollmentChecked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-8">
          <LoadingSkeleton variant="card" />
        </main>
      </div>
    );
  }

  if (bundleError || coursesError || !bundle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState
            error={bundleError as Error}
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

        {/* Header: Title, Categories, Quick stats */}
        <div className="space-y-6 mb-8">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Bundle</Badge>
            {bundle.categoryIds?.map((category) => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            {bundle.title}
          </h1>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
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
        </div>

        {/* Two-column layout: Left (thumbnail + about), Right (pricing + CTA) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Thumbnail + About */}
          <div className="space-y-6">
            {/* Thumbnail */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {bundle.thumbnail ? (
                    <>
                      <img
                        src={bundle.thumbnail.includes("https://vizuara.ai/")
                          ? bundle.thumbnail.replace(
                            "https://vizuara.ai/",
                            "https://vizuaracoin.wpcomstaging.com/"
                          )
                          : bundle.thumbnail}
                        alt={`${bundle.title} thumbnail`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About This Bundle */}
            {bundle.description && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Bundle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: bundle.description }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Pricing + CTA */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Pricing */}
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
                    className="self-start text-green-600 border-green-600"
                  >
                    Save{" "}
                    {Math.round(
                      ((bundle.regularPrice - bundle.salePrice) /
                        bundle.regularPrice) *
                      100
                    )}
                    %
                  </Badge>

                  {/* Ownership info */}
                  {ownedCoursesCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-900 font-semibold border border-blue-300 hover:bg-blue-200"
                    >
                      You already own <strong>{ownedCoursesCount}</strong> of{" "}
                      <strong>{bundle.courses.length}</strong> courses
                    </Badge>
                  )}

                  {/* CTA */}
                  <div className="space-y-2">
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
                        "w-full text-white",
                        ownsAllCourses
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-black hover:bg-gray-800"
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bundle Contents */}
        <div className="rounded-2xl p-0 md:p-0 mb-8 mt-10">
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
                  <CourseCard key={course.id} course={course} variant="default" />
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
                        ₹{(bundle.regularPrice - bundle.salePrice).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>Progress tracking across all courses</span>
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
