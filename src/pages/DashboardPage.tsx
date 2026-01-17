// pages/DashboardPage.tsx

import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Loader2,
  Flame,
  Star,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BannerSlider } from "@/components/BannerSlider";
import { fetchDailyKarmaService } from "@/services/karmaService/fetchkarmaDaily";
import Leaderboard from "@/components/Leaderboard";

// Leaderboard Modal Component
function LeaderboardModal({
  isOpen,
  onClose,
  courseId,
  courseName,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  currentUserId: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{courseName} - Leaderboard</DialogTitle>
        </DialogHeader>
        <Leaderboard courseId={courseId} currentUserId={currentUserId} itemsPerPage={15} />
      </DialogContent>
    </Dialog>
  );
}

function EnrolledCourseCard({
  enrollment,
  certificateStatus,
  fetchEnrollmentsAndCertificateRequestStatuses,
  karma,
  onViewLeaderboard,
  hasLeaderboardData,
}: {
  enrollment: Enrollment;
  certificateStatus: CertificateRequestStatus | null;
  fetchEnrollmentsAndCertificateRequestStatuses: () => void;
  karma: number;
  onViewLeaderboard: (courseId: string, courseName: string) => void;
  hasLeaderboardData: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourseQuery(enrollment.courseId);
  const [isProgressLoading, setIsProgressLoading] = useState(true);

  const [isEligibleForCertificate, setIsEligibleForCertificate] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!enrollment.completionDate);
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
      if (!course?.isCertificateEnabled) {
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
            <div className="flex items-start justify-between gap-4 mb-3">
              {/* Course title */}
              <h3 className="font-semibold text-lg leading-snug text-gray-900 dark:text-gray-100">
                {enrollment.courseName || course.title}
              </h3>

              {/* Right-side badges */}
              <div className="flex items-center gap-2 shrink-0">
                {karma > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-semibold whitespace-nowrap">{karma} Karma</span>
                  </div>
                )}

                {showCertificateFeatures && (
                  <div className="flex items-center justify-center h-8 w-h-8 rounded-full">
                    <img
                      src="/isCertificateAvailableIcon.png"
                      alt="Certificate available"
                      className="h-5 w-5"
                    />
                  </div>
                )}
              </div>
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
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {/* Leaderboard Button - Only show if there's leaderboard data */}
                {hasLeaderboardData && (
                  <Button
                    size="sm"
                    variant="nohover"
                    onClick={() => onViewLeaderboard(enrollment.courseId, course.title)}
                    className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:!border-yellow-500/50 hover:!from-yellow-500/20 hover:!to-orange-500/20"
                  >
                    <Star className="h-4 w-4 sm:mr-2 text-yellow-600" />
                    <span className="hidden sm:block text-yellow-700 dark:text-yellow-400">
                      Leaderboard
                    </span>
                  </Button>
                )}

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
                        {isCompleting ? (
                          <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">
                          {isCompleting ? "Completing..." : "Complete Course"}
                        </span>
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

  // Leaderboard modal state
  const [leaderboardModal, setLeaderboardModal] = useState<{
    isOpen: boolean;
    courseId: string;
    courseName: string;
  }>({
    isOpen: false,
    courseId: "",
    courseName: "",
  });

  // Notification states
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [karmaMap, setKarmaMap] = useState<Record<string, number>>({});
  const [isKarmaLoading, setIsKarmaLoading] = useState(false);

  // Track which courses have leaderboard data (any participant with karma > 0)
  const [leaderboardDataMap, setLeaderboardDataMap] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();

  // Handle opening leaderboard modal
  const handleViewLeaderboard = (courseId: string, courseName: string) => {
    setLeaderboardModal({
      isOpen: true,
      courseId,
      courseName,
    });
  };

  // Handle closing leaderboard modal
  const handleCloseLeaderboard = () => {
    setLeaderboardModal({
      isOpen: false,
      courseId: "",
      courseName: "",
    });
  };

  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (!user?.id) return;
      if (!("Notification" in window)) return;

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

  const fetchKarmaData = async (courseIds: string[]) => {
    if (!user?.id || !courseIds.length) return;

    setIsKarmaLoading(true);
    try {
      const newKarmaMap: Record<string, number> = {};

      const karmaPromises = courseIds.map(async (courseId) => {
        const result = await fetchDailyKarmaService.getUserKarmaHistory(user.id, courseId);

        if (result.success && result.data) {
          let totalKarma = 0;
          for (const entry of result.data) {
            totalKarma += entry.karmaEarned;
          }
          return { courseId, karma: totalKarma };
        }
        return { courseId, karma: 0 };
      });

      const karmaResults = await Promise.all(karmaPromises);

      for (const { courseId, karma } of karmaResults) {
        newKarmaMap[courseId] = karma;
      }

      setKarmaMap(newKarmaMap);
    } catch (error) {
      console.error("Failed to fetch karma data:", error);
    } finally {
      setIsKarmaLoading(false);
    }
  };

  // Fetch leaderboard data to check if any participant has karma
  const fetchLeaderboardData = async (courseIds: string[]) => {
    if (!courseIds.length) return;

    try {
      const newLeaderboardDataMap: Record<string, boolean> = {};

      const leaderboardPromises = courseIds.map(async (courseId) => {
        try {
          // Fetch all karma data for the course (not just current user)
          const result = await fetchDailyKarmaService.getCourseLeaderboard(courseId, user.id);

          if (result.success && result.data && result.data.totalCount > 0) {
            // Check if any participant has karma > 0
            const hasAnyKarma =
              result.data?.leaderboard.some((entry) => entry.totalKarma > 0) ?? false;
            return { courseId, hasData: hasAnyKarma };
          }
          return { courseId, hasData: false };
        } catch (error) {
          console.error(`Failed to fetch leaderboard for course ${courseId}:`, error);
          return { courseId, hasData: false };
        }
      });

      const leaderboardResults = await Promise.all(leaderboardPromises);

      for (const { courseId, hasData } of leaderboardResults) {
        newLeaderboardDataMap[courseId] = hasData;
      }

      setLeaderboardDataMap(newLeaderboardDataMap);
    } catch (error) {
      console.error("Failed to fetch leaderboard data:", error);
    }
  };

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
      await fetchKarmaData(courseIds);
      await fetchLeaderboardData(courseIds);
    } else {
      setEnrollments([]);
    }
    setIsLoading(false);
  };

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
        disabled: false,
      };
    }
    return {
      icon: <Bell className="h-4 w-4 mr-2" />,
      text: isEnablingNotifications ? "Enabling..." : "Enable Notifications",
      variant: "outline" as const,
      disabled: isEnablingNotifications,
    };
  };

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-8xl px-4 py-4 sm:px-6 sm:py-6">
            {/* Mobile top bar */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h1 className="text-lg font-semibold">Dashboard</h1>
              <UserSidebarMobileToggle />
            </div>

            {/* Banners */}
            {!isBannersLoading && banners.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <BannerSlider banners={banners} autoSlideInterval={5000} />
              </div>
            )}

            {/* Courses header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold">
                My Courses (<strong>{stats.totalCourses}</strong>)
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                {enrollments.length > 0 && (
                  <Link to="/courses">
                    <Button className="w-full sm:w-auto">Browse Courses</Button>
                  </Link>
                )}

                <Button
                  variant={notificationButton.variant}
                  onClick={handleEnableNotifications}
                  disabled={notificationButton.disabled}
                  className="w-full sm:w-auto"
                >
                  {notificationButton.icon}
                  {notificationButton.text}
                </Button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="grid gap-6">
                <LoadingSkeleton className="h-40 sm:h-48" />
                <LoadingSkeleton className="h-40 sm:h-48" />
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
                    karma={karmaMap[enrollment.courseId] || 0}
                    onViewLeaderboard={handleViewLeaderboard}
                    hasLeaderboardData={leaderboardDataMap[enrollment.courseId] || false}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 sm:p-12 text-center">
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
        </main>
      </div>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={leaderboardModal.isOpen}
        onClose={handleCloseLeaderboard}
        courseId={leaderboardModal.courseId}
        courseName={leaderboardModal.courseName}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
