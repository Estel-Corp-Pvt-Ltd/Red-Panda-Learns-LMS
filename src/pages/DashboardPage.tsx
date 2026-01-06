import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { CERTIFICATE_REQUEST_STATUS, LEARNING_UNIT, PLATFROM_TYPE } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useCourseQuery } from "@/hooks/useCaching";
import { certificateRequestService } from "@/services/certificate-request-service";
import { enrollmentService } from "@/services/enrollmentService";
import { learningProgressService } from "@/services/learningProgressService";
import { bannerService } from "@/services/bannerService";
import { Enrollment } from "@/types/enrollment";
import { Banner } from "@/types/banner";
import { CertificateRequestStatus } from "@/types/general";
import { formatDate } from "@/utils/date-time";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  PlayCircle,
  MessageSquare,
  Award,
  Bell,
  BellOff,
  Loader2
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BannerSlider } from "@/components/BannerSlider";


function EnrolledCourseCard({
  enrollment,
  certificateStatus,
  fetchEnrollmentsAndCertificateRequestStatuses,
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
  const [isCompleted, setIsCompleted] = useState(!!enrollment.completionDate); // completionDate exists
  const [isCompleting, setIsCompleting] = useState(false);
  const isCertificateIdAvailable = !!enrollment.certification?.certificateId;

  const totalLessons =
    course?.topics?.reduce((sum, topic) => {
      return (
        sum +
        (topic.items ? topic.items.filter((item) => item.type === LEARNING_UNIT.LESSON).length : 0)
      );
    }, 0) || 0;

  const handleCompleteCourse = async () => {
    try {
      setIsCompleting(true);
      const result = await learningProgressService.completeCourse(
        enrollment.userId,
        enrollment.courseId
      );
      if (result.success && result.data) {
        setIsCompleted(true);

        toast({
          title: "Course completed",
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
      if (enrollment.completionDate) {
        setIsEligibleForCertificate(true);
        setIsProgressLoading(false);
        return;
      }
      if (!course.isCertificateEnabled) {
        setIsEligibleForCertificate(false);
        setIsProgressLoading(false);
        return;
      }
      setIsProgressLoading(true);
      const result = await learningProgressService.getUserCourseProgress(
        enrollment.userId,
        enrollment.courseId
      );

      if (result.success && result.data[0]) {
        const progress = result.data[0];
        const completedLessonsCount = Array.isArray(progress.lessonHistory)
          ? progress.lessonHistory.length
          : Object.keys(progress.lessonHistory).length;

        const eligible = totalLessons > 0 && completedLessonsCount >= Math.ceil(0.9 * totalLessons);
        setIsEligibleForCertificate(eligible);
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
      ?.flatMap((topic) => topic.items || [])
      .find((item) => item?.id)?.id;

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

  const showCertificateFeatures = course.isCertificateEnabled;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{enrollment.courseName || course.title}</h3>
              {showCertificateFeatures && (
                <div className="flex items-center gap-1.5   px-2 py-1 rounded-full">
                  <img
                    src="/isCertificateAvailableIcon.png"
                    alt="Certificate available"
                    className="h-8 w-8"
                  />
                </div>
              )}
            </div>
            <p
              className="text-muted-foreground text-sm mb-4 line-clamp-2"
              dangerouslySetInnerHTML={{
                __html: course.description.replace(/<[^>]+>/g, ""),
              }}
            ></p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Enrolled {formatDate(enrollment.enrollmentDate)}</span>
                </div>
                {/* <Badge variant="outline" className="text-xs">
                  {enrollment.status}
                </Badge> */}
              </div>
              <div className="flex gap-3">
                {course?.isForumEnabled && (
                  <Link to={`/courses/${course.slug}/forum`}>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:block">Forum</span>
                    </Button>
                  </Link>
                )}
                <Button size="sm" onClick={handleContinueLearning}>
                  <PlayCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:block">Continue</span>
                </Button>

                {showCertificateFeatures && (
                  <>
                    {!isProgressLoading && isEligibleForCertificate && !isCompleted && (
                      <Button size="sm" onClick={handleCompleteCourse} disabled={isCompleting}>
                        {isCompleting ? <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 sm:mr-2" />}
                        <span className="hidden sm:inline">{isCompleting ? "Completing..." : "Complete Course"}</span>
                      </Button>
                    )}

                    {!isProgressLoading && isCompleted && (
                      <>
                        {isCertificateIdAvailable ? (
                          <Link to={`/certificate/${user.id}_${course.id}/`}>
                            <Button size="sm">
                              <Award className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">View Certificate</span>
                            </Button>
                          </Link>
                        ) : (
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
  const [certificateStatusMap, setCertificateStatusMap] = useState<
    Record<string, CertificateRequestStatus | null>
  >({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannersLoading, setIsBannersLoading] = useState(false);

  // Notification states
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (!user?.id) return; // Only ask if user is logged in
      if (!("Notification" in window)) return; // Browser doesn't support

      // Only ask if permission hasn't been granted or denied yet
      if (Notification.permission === "default") {
        try {
          setIsEnablingNotifications(true);
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);

          if (permission === "granted") {
            toast({
              title: "Notifications enabled",
              description: "You'll be notified when grading is completed.",
            });
          } else if (permission === "denied") {
            toast({
              title: "Notifications disabled",
              description:
                "You denied notification permission. You can enable it in browser settings.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Notification setup failed",
            description: "Please try again later.",
            variant: "destructive",
          });
        } finally {
          setIsEnablingNotifications(false);
        }
      }
    };

    requestNotificationPermission();
  }, [user]);

  // Handle enabling notifications (button click)

  const fetchEnrollmentsAndCertificateRequestStatuses = async () => {
    if (!user || !user.email) return;
    setIsLoading(true);

    const result = await enrollmentService.getUserEnrollments(user.id);
    if (result.success) {
      setEnrollments(result.data);

      const courseIds = result.data.map((e) => e.courseId);

      const certificateStatusResult =
        await certificateRequestService.getCertificateRequestStatusForCourses(user.id, courseIds);

      if (certificateStatusResult.success) {
        setCertificateStatusMap(certificateStatusResult.data);
      }

      await fetchBanners(courseIds);
    } else {
      setEnrollments([]);
    }
    setIsLoading(false);
  };

  console.log("fcm token", user.fcmTokens);
  const fetchBanners = async (enrolledCourseIds: string[]) => {
    if (!enrolledCourseIds || enrolledCourseIds.length === 0) {
      const result = await bannerService.getActiveGlobalBanners();
      if (result.success) {
        setBanners(result.data);
      } else {
        setBanners([]);
      }
      return;
    }

    setIsBannersLoading(true);
    const result = await bannerService.getActiveBannersForUser(enrolledCourseIds);
    if (result.success) {
      setBanners(result.data);
    } else {
      setBanners([]);
    }
    setIsBannersLoading(false);
  };

  useEffect(() => {
    fetchEnrollmentsAndCertificateRequestStatuses();
  }, [user?.id]);

  const stats = {
    totalCourses: enrollments.length,
  };

  // Determine notification button state
  const getNotificationButtonContent = () => {
    if (notificationPermission === "granted") {
      return {
        icon: <Bell className="h-4 w-4 mr-2" />,
        text: "Notifications Enabled",
        variant: "secondary" as const,
        disabled: true,
      };
    }
    if (notificationPermission === "denied") {
      return {
        icon: <BellOff className="h-4 w-4 mr-2" />,
        text: "Enable Notifications",
        variant: "outline" as const,
        disabled: false, // Keep enabled so user can click
      };
    }
    return {
      icon: <Bell className="h-4 w-4 mr-2" />,
      text: isEnablingNotifications ? "Enabling..." : "Enable Notifications",
      variant: "outline" as const,
      disabled: isEnablingNotifications,
    };
  };

  // Handle enabling notifications (button click)
  const handleEnableNotifications = async () => {
    if (!user?.id) return;

    try {
      setIsEnablingNotifications(true);

      if (!("Notification" in window)) {
        toast({
          title: "Notifications not supported",
          description: "Your browser doesn't support notifications.",
          variant: "destructive",
        });
        return;
      }

      if (Notification.permission === "denied") {
        toast({
          title: "Notifications are blocked",
          description: "Enable notifications from your browser settings, then refresh the page.",
          variant: "destructive",
        });
        return;
      }

      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        toast({
          title: "Notifications disabled",
          description: "You denied notification permission. You can enable it in browser settings.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Notifications enabled",
        description: "You'll be notified when grading is completed.",
      });
    } catch (error) {
      toast({
        title: "Notification setup failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const notificationButton = getNotificationButtonContent();

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile inside Sidebar component) */}
        <Sidebar />
        <div className="flex-1 w-full mx-auto p-6 overflow-y-auto no-scrollbar::-webkit-scrollbar no-scrollbar">
          {/* Banners Section */}
          {!isBannersLoading && banners.length > 0 && (
            <div className="mb-8">
              <BannerSlider banners={banners} autoSlideInterval={5000} />
            </div>
          )}


          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground">Active enrollments</p>
              </CardContent>
            </Card>
          </div> */}

          {/* Enrolled Courses */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">My Courses (<strong>{stats.totalCourses}</strong>)</h2>
              <div className="flex gap-3">
                {enrollments.length > 0 && (
                  <Link to="/courses">
                    <Button>Browse Courses</Button>
                  </Link>
                )}
                <Button
                  variant={notificationButton.variant}
                  onClick={handleEnableNotifications}
                  disabled={notificationButton.disabled}
                >
                  {notificationButton.icon}
                  {notificationButton.text}
                </Button>
              </div>
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
                    fetchEnrollmentsAndCertificateRequestStatuses={
                      fetchEnrollmentsAndCertificateRequestStatuses
                    }
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
}
