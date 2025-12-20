import { Header } from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { CERTIFICATE_REQUEST_STATUS, LEARNING_UNIT } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCourseQuery } from '@/hooks/useCaching';
import { certificateRequestService } from '@/services/certificate-request-service';
import { enrollmentService } from '@/services/enrollmentService';
import { learningProgressService } from '@/services/learningProgressService';
import { bannerService } from '@/services/bannerService';
import { Enrollment } from '@/types/enrollment';
import { Banner } from '@/types/banner';
import { CertificateRequestStatus } from '@/types/general';
import { formatDate } from '@/utils/date-time';
import { BookOpen, CheckCircle, Clock, Eye, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BannerSlider } from '@/components/BannerSlider';
function EnrolledCourseCard({
  enrollment,
  certificateStatus,
  fetchEnrollmentsAndCertificateRequestStatuses
}: {
  enrollment: Enrollment;
  certificateStatus: CertificateRequestStatus | null;
  fetchEnrollmentsAndCertificateRequestStatuses: () => void;
}) {

  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourseQuery(enrollment.courseId);
  const [isProgressLoading, setIsProgressLoading] = useState(true);

  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // completionDate exists
  const [isCertificateIdAvailable, setIsCertificateIdAvailable] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const totalLessons = course?.topics?.reduce((sum, topic) => {
    return sum + (topic.items ?
      topic.items.filter(item => item.type === LEARNING_UNIT.LESSON).length
      : 0
    );
  }, 0) || 0;

  const handleCompleteCourse = async () => {
    try {
      setIsCompleting(true);
      const result = await learningProgressService.completeCourse(enrollment.userId, enrollment.courseId);

      if (result.success && result.data) {
        setIsCompleted(true);

        toast({
          title: "Course completed 🎉",
          description: "You have successfully completed the course.",
        });
      } else {
        toast({
          title: "Not eligible yet",
          description: "Please complete more lessons.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  useEffect(() => {
    const fetchLearningProgress = async () => {
      setIsProgressLoading(true);
      const result = await learningProgressService.getUserCourseProgress(enrollment.userId, enrollment.courseId);
      if (result.success && result.data[0]) {
        const progress = result.data[0];
        const completedLessonsCount = Array.isArray(progress.lessonHistory)
          ? progress.lessonHistory.length
          : Object.keys(progress.lessonHistory).length;

        const eligible =
          totalLessons > 0 &&
          completedLessonsCount >= Math.ceil(0.9 * totalLessons);

        setIsEligibleForCertificate(eligible);
        setIsCertificateIdAvailable(!!progress.certification?.certificateId);
        setIsCompleted(!!progress.completionDate);
      }
      setIsProgressLoading(false);
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

  // Check if certificate features should be shown
  const showCertificateFeatures = course.isCertificateEnabled;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{enrollment.courseName || course.title}</h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: course.description.replace(/<[^>]+>/g, '') }}>
            </p>

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

                {/* Only show certificate-related features if enabled */}
                {showCertificateFeatures && (
                  <>
                    {!isProgressLoading && isEligibleForCertificate && !isCompleted && (
                      <Button
                        size="sm"
                        onClick={handleCompleteCourse}
                        disabled={isCompleting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isCompleting ? "Completing..." : "Complete Course"}
                      </Button>
                    )}

                    {!isProgressLoading && isCompleted && (
                      <>
                        {/* PRIORITY 1: Show certificate if it exists (bypasses all request logic) */}
                        {isCertificateIdAvailable ? (
                          <Link to={`/certificate/${user.id}_${course.id}/`}>
                            <Button size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Certificate
                            </Button>
                          </Link>
                        ) : (
                          /* PRIORITY 2: Handle request flow only if certificate doesn't exist */
                          <>
                            {certificateStatus === CERTIFICATE_REQUEST_STATUS.PENDING ? (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Certificate request pending
                              </Badge>
                            ) : certificateStatus === CERTIFICATE_REQUEST_STATUS.APPROVED ? (
                              <Badge variant="secondary" className="text-xs">
                                Certificate approved - generating...
                              </Badge>
                            ) : (
                              /* No request made yet - show request option */
                              <>
                                <Badge variant="secondary" className="text-xs">
                                  Certificate available on request
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const res = await certificateRequestService.requestCertificate(
                                      enrollment.userId,
                                      enrollment.courseId
                                    );

                                    if (res.success) {
                                      toast({
                                        title: "Certificate requested",
                                        description: "Pending approval",
                                      });
                                      fetchEnrollmentsAndCertificateRequestStatuses();
                                    } else {
                                      toast({
                                        title: "Certificate request failed",
                                        description: "Try again later",
                                      });
                                    }
                                  }}
                                >
                                  Request Certificate
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
                
              </div>
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
  const [certificateStatusMap, setCertificateStatusMap] = useState<Record<string, CertificateRequestStatus | null>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannersLoading, setIsBannersLoading] = useState(false);

  const navigate = useNavigate();

  const fetchEnrollmentsAndCertificateRequestStatuses = async () => {
    if (!user || !user.email) return;
    setIsLoading(true);

    const result = await enrollmentService.getUserEnrollments(user.id);
    if (result.success) {
      setEnrollments(result.data);

      const courseIds = result.data.map(e => e.courseId);

      const certificateStatusResult = await certificateRequestService.getCertificateRequestStatusForCourses(
        user.id,
        courseIds
      );

      if (certificateStatusResult.success) {
        setCertificateStatusMap(certificateStatusResult.data);
      }

      // Fetch banners for enrolled courses
      await fetchBanners(courseIds);
    } else {
      setEnrollments([]);
    }
    setIsLoading(false);
  };

  const fetchBanners = async (enrolledCourseIds: string[]) => {
    if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
      setBanners([]);
      return;
    }

    setIsBannersLoading(true);
    const result = await bannerService.getActiveBannersForUser(enrolledCourseIds);
    console.log("Fetched banners:", result);
    if (result.success) {
      setBanners(result.data);
    } else {
      console.error("Failed to fetch banners:", result.error);
      setBanners([]);
    }
    setIsBannersLoading(false);
  };

  useEffect(() => {
    fetchEnrollmentsAndCertificateRequestStatuses();
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
        <div className="flex-1 w-full mx-auto p-6 overflow-y-auto no-scrollbar::-webkit-scrollbar  no-scrollbar">
          {/* Header */}
          {/* <div className="mb-8">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
              <Link className='md:hidden' to="/submissions"><Button>View Submissions</Button> </Link>
            </div>
            <p className="text-muted-foreground">
              Track your learning progress and continue your courses
            </p>
          </div> */}

          {/* Banners Section */}
          {!isBannersLoading && banners.length > 0 && (
            <div className="mb-8">
              <BannerSlider banners={banners} autoSlideInterval={5000} />
            </div>
          )}
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
                  <EnrolledCourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    certificateStatus={certificateStatusMap[enrollment.courseId] ?? null}
                    fetchEnrollmentsAndCertificateRequestStatuses={fetchEnrollmentsAndCertificateRequestStatuses}
                  />
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
