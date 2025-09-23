import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useBundleQuery, useBundleCoursesQuery } from '@/hooks/useBundleApi';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { ArrowLeft, BookOpen, CheckCircle, Star, DollarSign } from 'lucide-react';
import { CourseCard } from '@/components/course/CourseCard';

export default function BundleDetailPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolled: isEnrolledInBundle, loading } = useEnrollment();

  const { data: bundle, isLoading, isError, error } = useBundleQuery(bundleId!);
  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useBundleCoursesQuery(bundleId!);

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!loading && user && bundle) {
        const enrolled = await isEnrolledInBundle(bundle.id);
        setIsEnrolled(enrolled);
        setEnrollmentChecked(true);
      }
    };

    checkEnrollment();
  }, [user, bundle, isEnrolledInBundle, loading]);

  if (isLoading || coursesLoading || loading || !enrollmentChecked) {
    console.log("Bundle ----> Data", bundle)
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

  const handleEnrollment = () => {
    if (isEnrolled) {
      navigate(`/bundle/${bundleId}/dashboard`);
    } else {
      navigate(`/bundle/${bundleId}/checkout`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
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
              <p className="text-lg text-gray-700">
                {bundle.description}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 text-gray-700">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span>{bundle.courses.length} Courses</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span>Save ${(bundle.regularPrice - bundle.salePrice)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <span>Expert Instructors</span>
              </div>
            </div>

            {/* Pricing + CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">
                  ${(bundle.salePrice).toFixed(2)}
                </div>
                <div className="text-lg line-through text-gray-500">
                  ${(bundle.regularPrice).toFixed(2)}
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Save {Math.round(((bundle.regularPrice - bundle.salePrice) / bundle.regularPrice) * 100)}%
                </Badge>
              </div>

              <Button
                onClick={handleEnrollment}
                size="lg"
                className="bg-black text-white hover:bg-gray-800"
              >
                {isEnrolled ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Access Bundle
                  </>
                ) : (
                  <>Buy Bundle for ${(bundle.salePrice).toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Bundle Contents */}
        <div className="rounded-2xl p-8 md:p-12 mb-8">
          <div className="">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Bundle Contents</h2>
                <p className="text-muted-foreground mb-6">
                  This bundle includes {bundle.courses.length} comprehensive courses designed to give you a complete learning experience.
                </p>
              </div>

              {/* Courses Grid */}
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
                      <span>Save ${(bundle.regularPrice - bundle.salePrice)} compared to individual purchases</span>
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
                      Course bundles are designed to provide a comprehensive learning path at a significant discount.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Individual Course Prices:</span>
                        <span className="font-medium">${(bundle.salePrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bundle Price:</span>
                        <span className="font-medium text-success">${(bundle.regularPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Your Savings:</span>
                        <span className="font-bold text-success">${(bundle.regularPrice - bundle.salePrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
