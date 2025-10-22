import { Header } from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import { COLLECTION, USER_ROLE } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebaseConfig';
import { useCourseQuery } from '@/hooks/useCaching';
import { enrollmentService } from '@/services/enrollmentService';
import { Enrollment } from '@/types/enrollment';
import { formatDate } from '@/utils/date-time';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { BookOpen, Clock, PlayCircle, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function EnrolledCourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { data: course, isLoading } = useCourseQuery(enrollment.targetId);

  if (isLoading) {
    return <LoadingSkeleton className="h-48" />;
  }

  if (!course) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {course.description}
            </p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{enrollment.progressSummary.percent}%</span>
              </div>
              <Progress value={enrollment.progressSummary.percent} />
            </div>

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
              <Button asChild size="sm">
                <Link to={`/course/${course?.id}`}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Continue
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndFetchEnrollments = async () => {
      if (!user || !user.email) return;

      // Query users collection where email == current user's email
      const usersRef = collection(db, COLLECTION.USERS);
      const q = query(usersRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.role === USER_ROLE.ADMIN) {
          navigate('/admin');
          return; // Skip loading enrollments
        }
      }

      // If not admin, fetch enrollments
      const result = await enrollmentService.getUserEnrollments(user.id);

      if (result.success) {
        setEnrollments(result.data);
      } else {
        setEnrollments([]);
        // TODO: Add a toast here
      }

      setIsLoading(false);
    };

    checkAdminAndFetchEnrollments();
  }, [user, navigate]);

  const stats = {
    totalCourses: enrollments.length,
    completedCourses: enrollments.filter(e => e.progressSummary.percent === 100).length,
    averageProgress: enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progressSummary.percent, 0) / enrollments.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
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

          <Card>
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
          </Card>

          <Card>
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
          </Card>
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
  );
}
