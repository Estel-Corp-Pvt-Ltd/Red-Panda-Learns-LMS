import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { useBundleQuery, useBundleCoursesQuery, bundleQueryKeys } from '@/hooks/useBundleApi';
import { useAuth } from '@/contexts/AuthContext';
import { useEnrollment } from '@/contexts/EnrollmentContext';
import { ArrowLeft, BookOpen, Clock, Trophy, PlayCircle, CheckCircle, Star } from 'lucide-react';
import CourseCard from '@/components/course/CourseCard';

export default function BundleDashboardPage() {
 const { param } = useParams<{ param: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolledInBundle } = useEnrollment();

 const [bundleId, setBundleId] = useState("");

 const {
   data: bundle,
   isLoading: bundleLoading,
   error: bundleError,
 } = useBundleQuery(param!);

 useEffect(() => {
   if (!param || bundleLoading || !bundle) return;
   setBundleId(bundle.id);
 }, [param, bundleLoading, bundle]);

  const { data: courses, isLoading: coursesLoading, isError: coursesError } = useBundleCoursesQuery(bundleId!);
  

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
  if (bundle && !isEnrolled && !bundleLoading) {
    console.log('BundleDashboard - User not enrolled, redirecting to bundle page');
    navigate(`/bundle/${bundleId}`);
    return null;
  }

  if (bundleLoading || coursesLoading) {
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
        <main className="container px-4 py-8">
          <ErrorState
            error={bundleError as Error}
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

    <main className="container px-4 py-8 text-foreground">
      {/* Back Navigation */}
    <Button
  variant="ghost"
  onClick={() => navigate("/dashboard")}
  className="mb-8 text-primary hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
>
  <ArrowLeft className="h-4 w-4 mr-2" />
  Back to Dashboard
</Button>

      {/* Hero / Bundle Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-[#1a1b1f] dark:to-[#141517] text-foreground p-8 md:p-12 mb-10 border border-border/50 shadow-sm">
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              variant="secondary"
              className="bg-muted text-foreground border-border/50 dark:bg-zinc-800 dark:text-white"
            >
              Bundle
            </Badge>
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              Enrolled
            </Badge>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">{bundle.title}</h1>

          <p className="text-lg mb-8 text-muted-foreground">
            Track your progress across all courses in this bundle
          </p>

          <div className="flex flex-wrap gap-6 text-foreground/90">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span>{totalCourses} Total Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-muted-foreground" />
              <span>{completedCourses} Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-muted-foreground" />
              <span>{inProgressCourses} In Progress</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-2xl font-bold">{completedCourses}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{inProgressCourses}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Not Started
            </CardTitle>
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
      <Card className="mb-10 border border-border/60 shadow-sm dark:bg-[#111113]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-amber-500" />
            Achievements
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Your milestones in this bundle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-slate-50/70 dark:bg-zinc-800/50">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium text-foreground">Bundle Enrolled</p>
                <p className="text-sm text-muted-foreground">
                  Welcome to your learning journey!
                </p>
              </div>
            </div>

            {completedCourses > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-slate-50/70 dark:bg-zinc-800/50">
                <Star className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">First Course Complete</p>
                  <p className="text-sm text-muted-foreground">
                    You completed your first course!
                  </p>
                </div>
              </div>
            )}

            {overallProgress >= 50 && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-slate-50/70 dark:bg-zinc-800/50">
                <Trophy className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">Halfway There</p>
                  <p className="text-sm text-muted-foreground">
                    50% bundle completion
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Courses */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Your Courses</h2>
          <p className="text-muted-foreground">
            Access all courses included in your bundle
          </p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} variant="default" />
            ))}
          </div>
        ) : (
          <Card className="border border-border/60 shadow-sm">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No courses found in this bundle.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  </div>
);
}


