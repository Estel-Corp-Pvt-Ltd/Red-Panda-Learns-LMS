import { Header } from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCourseQuery } from '@/hooks/useCaching';
import { enrollmentService } from '@/services/enrollmentService';
import { learningProgressService } from '@/services/learningProgressService';
import { Enrollment } from '@/types/enrollment';
import { LearningProgress } from '@/types/learning-progress';
import { formatDate } from '@/utils/date-time';
import { BookOpen, Clock, Download, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function EnrolledCourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourseQuery(enrollment.courseId);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(true);

  const totalLessons = course?.topics?.reduce((sum, topic) => {
    return sum + (topic.items ? topic.items.length : 0);
  }, 0) || 0;

  useEffect(() => {
    const fetchLearningProgress = async () => {
      try {
        setIsProgressLoading(true);
        const result = await learningProgressService.getUserCourseProgress(enrollment.userId, enrollment.courseId);
        if (result.success) {
          setLearningProgress(result.data[0] ?? null);
        }
      } catch (error) {
        setLearningProgress(null);
      } finally {
        setIsProgressLoading(false);
      }
    };

    fetchLearningProgress();
  }, [course]);

  if (isLoading) {
    return <LoadingSkeleton className="h-48" />;
  }

  if (!course) return null;

  const handleContinueLearning = () => {
    if (!course) return;

    const firstLessonId = course.topics
      ?.flatMap(topic => topic.items || [])
      .find(item => item?.id)?.id;

    if (firstLessonId) {
      const courseSlug = course.slug || course.id;
      navigate(`/courses/${courseSlug}/lesson/${firstLessonId}`);
    } else {
      toast({
        title: "No content available",
        description: "This course has no lessons available yet.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{enrollment.courseName || course.title}</h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: course.description.replace(/<[^>]+>/g, '') }}>
            </p>

            {/* <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{enrollment.progressSummary?.percent ?? 0}%</span>
              </div>
              <Progress value={enrollment.progressSummary?.percent ?? 0} />
            </div> */}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Enrolled {formatDate(
                    enrollment.enrollmentDate)}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {enrollment.status}
                </Badge>
              </div>
              <div className="flex gap-3">
                <Button size="sm" onClick={handleContinueLearning}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Continue
                </Button>
                {!isProgressLoading && learningProgress?.lessonHistory.length > 0 && 0.6 * totalLessons <= learningProgress.lessonHistory.length && (
                  <Link to={`/certificate/${user.id}_${course.id}/`}>
                    <Button size="sm" onClick={handleContinueLearning}>
                      <Download className="h-4 w-4 mr-2" /> Certificate
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndFetchEnrollments = async () => {
      if (!user || !user.email) return;
      const result = await enrollmentService.getUserEnrollments(user.id);
      if (result.success) {
        setEnrollments(result.data);
      } else {
        setEnrollments([]);
      }
      setIsLoading(false);
    };

    checkAdminAndFetchEnrollments();
  }, [user, navigate]);

  const stats = {
    totalCourses: enrollments.length,
    // completedCourses: enrollments.filter(e => e.progressSummary?.percent === 100).length,
    // averageProgress: enrollments.length > 0
    //   ? Math.round(enrollments.reduce((sum, e) => sum + e.progressSummary?.percent, 0) / enrollments.length)
    //   : 0,
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 w-full mx-auto p-6 overflow-y-scroll">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
              <Link className='md:hidden' to="/submissions"><Button>View Submissions</Button> </Link>
            </div>
            <p className="text-muted-foreground">
              Track your learning progress and continue your courses
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground">
                  Active enrollments
                </p>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedCourses}</div>
                <p className="text-xs text-muted-foreground">
                  Courses finished
                </p>
              </CardContent>
            </Card> */}

            {/* <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageProgress}%</div>
                <p className="text-xs text-muted-foreground">
                  Across all courses
                </p>
              </CardContent>
            </Card> */}
          </div>

          {/* Enrolled Courses */}
          <div>
            <div className='flex justify-between items-center mb-6'>
              <h2 className="text-2xl font-semibold">My Courses</h2>
              {enrollments.length > 0 && (<Link to="/courses"><Button>Browse Courses</Button></Link>)}
            </div>
            {isLoading ? (
              <div className="grid gap-6">
                <LoadingSkeleton className="h-48" />
                <LoadingSkeleton className="h-48" />
              </div>
            ) : enrollments.length > 0 ? (
              <div className="grid gap-6">
                {enrollments.map((enrollment) => (
                  <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start your learning journey by enrolling in a course
                  </p>
                  <Button asChild>
                    <Link to="/courses">Browse Courses</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
