import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useBundleQuery, useBundleCoursesQuery } from '@/hooks/useBundleApi';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { ArrowLeft, BookOpen, Clock, Trophy, PlayCircle, CheckCircle, Star } from 'lucide-react';
import { CourseCard } from '@/components/course/CourseCard';

export default function BundleDashboardPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolledInBundle } = useEnrollment();

  const { data: bundle, isLoading, isError, error } = useBundleQuery(bundleId!);
  console.log("dara", bundle)
  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useBundleCoursesQuery(bundleId!);
  console.log(courses, "dara 2")

  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (user && bundle) {
        const enrolled = await isEnrolledInBundle(bundle.id);
        setIsEnrolled(enrolled);
        console.log('BundleDashboard - Enrollment check:', { bundleId: bundle.id, enrolled });
      }
    };

    checkEnrollment();
  }, [user, bundle, isEnrolledInBundle]);

  if (!user) {
    navigate('/auth/login');
    return null;
  }

  // Only redirect if we have checked enrollment and user is not enrolled
  if (bundle && !isEnrolled && !isLoading) {
    console.log('BundleDashboard - User not enrolled, redirecting to bundle page');
    navigate(`/bundle/${bundleId}`);
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

  // Calculate progress (mock data for now)
  const totalCourses = courses?.length || 0;
  const completedCourses = Math.floor(totalCourses * 0.3); // 30% completed for demo
  const inProgressCourses = Math.floor(totalCourses * 0.4); // 40% in progress for demo
  const notStartedCourses = totalCourses - completedCourses - inProgressCourses;
  const overallProgress = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container px-4 py-8">
        {/* Back Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Bundle Header */}
        <div className="bg-gradient-hero rounded-2xl p-8 md:p-12 mb-8 text-primary-foreground">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                Bundle
              </Badge>
              <Badge variant="secondary" className="bg-success/20 text-success border-0">
                Enrolled
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {bundle.title}
            </h1>

            <p className="text-lg mb-6 text-primary-foreground/90">
              Track your progress across all courses in this bundle
            </p>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span>{totalCourses} Total Courses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>{completedCourses} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                <span>{inProgressCourses} In Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{completedCourses}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">{inProgressCourses}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Not Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{notStartedCourses}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Achievements
            </CardTitle>
            <CardDescription>
              Your milestones in this bundle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
                <CheckCircle className="h-8 w-8 text-success" />
                <div>
                  <p className="font-medium">Bundle Enrolled</p>
                  <p className="text-sm text-muted-foreground">Welcome to your learning journey!</p>
                </div>
              </div>

              {completedCourses > 0 && (
                <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
                  <Star className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-medium">First Course Complete</p>
                    <p className="text-sm text-muted-foreground">You completed your first course!</p>
                  </div>
                </div>
              )}

              {overallProgress >= 50 && (
                <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg">
                  <Trophy className="h-8 w-8 text-warning" />
                  <div>
                    <p className="font-medium">Halfway There</p>
                    <p className="text-sm text-muted-foreground">50% bundle completion</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Courses */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Courses</h2>
            <p className="text-muted-foreground">
              Access all courses included in your bundle
            </p>
          </div>

          {courses && courses.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courses.map((course, index) => {
                // Mock progress data
                let status: 'not-started' | 'in-progress' | 'completed' = 'not-started';
                let progress = 0;

                if (index < completedCourses) {
                  status = 'completed';
                  progress = 100;
                } else if (index < completedCourses + inProgressCourses) {
                  status = 'in-progress';
                  progress = Math.floor(Math.random() * 80) + 10; // 10-90% progress
                }

                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="default"
                  />
                );
              })}
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
        </div>
      </main>
    </div>
  );
}