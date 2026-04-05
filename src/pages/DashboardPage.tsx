// pages/DashboardPage.tsx — Claymorphic Dashboard

import { Header } from "@/components/Header";
import Sidebar, { UserSidebarMobileToggle } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Progress } from "@/components/ui/progress";
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
  PlayCircle,
  MessageSquare,
  Award,
  Bell,
  BellOff,
  Loader2,
  Flame,
  Star,
  Trophy,
  GraduationCap,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BannerSlider } from "@/components/BannerSlider";
import { fetchDailyKarmaService } from "@/services/karmaService/fetchkarmaDaily";
import Leaderboard from "@/components/Leaderboard";

/* ═══════════════════════════════════════════════════════
   Claymorphic style helpers
   ═══════════════════════════════════════════════════════ */

const clay =
  "rounded-3xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md shadow-[6px_6px_16px_rgba(0,0,0,0.08),-4px_-4px_12px_rgba(255,255,255,0.6)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.35),-4px_-4px_12px_rgba(255,255,255,0.04)] border border-white/40 dark:border-white/10";

const claySmall =
  "rounded-2xl bg-white/50 dark:bg-white/[0.05] backdrop-blur-sm shadow-[4px_4px_10px_rgba(0,0,0,0.06),-3px_-3px_8px_rgba(255,255,255,0.5)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.3),-3px_-3px_8px_rgba(255,255,255,0.03)] border border-white/30 dark:border-white/10";

const clayInset =
  "rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.06),inset_-2px_-2px_6px_rgba(255,255,255,0.4)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.2),inset_-2px_-2px_6px_rgba(255,255,255,0.02)]";

/* ═══════════════════════════════════════════════════════
   Leaderboard Modal
   ═══════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════
   Stat Card
   ═══════════════════════════════════════════════════════ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className={`${claySmall} p-5 flex items-center gap-4 transition-transform hover:scale-[1.02]`}>
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-foreground leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Enrolled Course Card — Claymorphic
   ═══════════════════════════════════════════════════════ */

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
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState(0);
  const isCertificateIdAvailable = !!enrollment.certification?.certificateId;

  const totalLessons =
    course?.topics?.reduce(
      (sum, topic) =>
        sum + (topic.items ? topic.items.filter((item) => item.type === LEARNING_UNIT.LESSON).length : 0),
      0
    ) || 0;

  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleCompleteCourse = async () => {
    try {
      setIsCompleting(true);
      console.warn("completeCourse cloud function is disabled");
      toast({
        title: "Not eligible yet",
        description: "Please complete more lessons.",
        variant: "destructive",
      });
    } catch {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
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
      if (!course?.isCertificateEnabled && !course?.isCourseCompletionEnabled) {
        setIsEligibleForCertificate(false);
        setIsProgressLoading(false);
        return;
      }
      setIsProgressLoading(true);
      const result = await learningProgressService.getUserCourseProgress(enrollment.userId, enrollment.courseId);
      if (result.success && result.data[0]) {
        const progress = result.data[0];
        const count = Array.isArray(progress.lessonHistory)
          ? progress.lessonHistory.length
          : Object.values(progress.lessonHistory).filter((e) => e.type === LEARNING_UNIT.LESSON).length;
        setCompletedLessons(count);
        setCurrentLessonId(progress.currentLessonId ?? null);
        setIsEligibleForCertificate(totalLessons > 0 && count >= Math.ceil(0.9 * totalLessons));
      }
      setIsProgressLoading(false);
    };
    fetchLearningProgress();
  }, [course]);

  if (isLoading) return <div className={`${claySmall} h-44 animate-pulse`} />;
  if (!course) return null;

  const handleContinueLearning = () => {
    if (!course) return;
    const firstLessonId = course.topics?.flatMap((t) => t.items || []).find((i) => i?.id)?.id;
    const target = currentLessonId || firstLessonId;
    if (target) navigate(`/courses/${course.slug || course.id}/lesson/${target}`);
    else toast({ title: "No content available", description: "No lessons available yet.", variant: "destructive" });
  };

  const showCertificateFeatures = course.isCertificateEnabled;
  const showCourseCompletion = course.isCourseCompletionEnabled ?? true;

  return (
    <div className={`${clay} p-5 sm:p-6 transition-transform hover:scale-[1.01] group`}>
      <div className="flex flex-col gap-4">
        {/* Top row: title + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors">
              {enrollment.courseName || course.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 line-clamp-1">
              {course.description.replace(/<[^>]+>/g, "")}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {karma > 0 && (
              <div className={`${clayInset} flex items-center gap-1.5 px-3 py-1.5`}>
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{karma}</span>
              </div>
            )}
            {showCertificateFeatures && (
              <div className="w-8 h-8 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Award className="h-4 w-4 text-yellow-600" />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalLessons > 0 && (
          <div className={`${clayInset} p-3`}>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-muted-foreground">
                {completedLessons} of {totalLessons} lessons
              </span>
              <span className={progressPct === 100 ? "text-emerald-600 font-bold" : "text-foreground"}>
                {progressPct}%
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5 rounded-full" />
          </div>
        )}

        {/* Bottom row: meta + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Enrolled {formatDate(enrollment.enrollmentDate)}</span>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {hasLeaderboardData && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewLeaderboard(enrollment.courseId, course.title)}
                className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
              >
                <Star className="h-4 w-4 text-yellow-600" />
                <span className="hidden sm:block ml-1.5 text-yellow-700 dark:text-yellow-400 text-xs font-semibold">
                  Leaderboard
                </span>
              </Button>
            )}

            {course?.isForumEnabled && (
              <Link to={`/courses/${course.slug}/forum`}>
                <Button size="sm" variant="ghost" className="rounded-xl">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:block ml-1.5 text-xs">Forum</span>
                </Button>
              </Link>
            )}

            <Button
              size="sm"
              onClick={handleContinueLearning}
              className="rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="ml-1.5 text-xs font-semibold">Continue</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>

            {showCourseCompletion &&
              !isProgressLoading &&
              isEligibleForCertificate &&
              !isCompleted && (
                <Button size="sm" onClick={handleCompleteCourse} disabled={isCompleting} className="rounded-xl">
                  {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-1.5 text-xs">
                    {isCompleting ? "Completing..." : "Complete"}
                  </span>
                </Button>
              )}

            {showCertificateFeatures && !isProgressLoading && isCompleted && (
              <>
                {isCertificateIdAvailable ? (
                  <Link to={`/certificate/${user.id}_${course.id}/`}>
                    <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                      <Award className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5 text-xs">Certificate</span>
                    </Button>
                  </Link>
                ) : (
                  <>
                    {certificateStatus === CERTIFICATE_REQUEST_STATUS.PENDING ? (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 rounded-xl">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    ) : certificateStatus === CERTIFICATE_REQUEST_STATUS.APPROVED ? (
                      <Badge variant="secondary" className="text-xs rounded-xl">Generating...</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={async () => {
                          const res = await certificateRequestService.requestCertificate(
                            enrollment.userId,
                            enrollment.courseId
                          );
                          if (res.success) {
                            toast({ title: "Certificate requested", description: "Pending approval" });
                            fetchEnrollmentsAndCertificateRequestStatuses();
                          } else {
                            toast({ title: "Request failed", description: "Try again later" });
                          }
                        }}
                      >
                        <Award className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1.5 text-xs">Request Cert</span>
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Dashboard | RedPanda Learns";
    return () => { document.title = "RedPanda Learns"; };
  }, []);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [certificateStatusMap, setCertificateStatusMap] = useState<Record<string, CertificateRequestStatus | null>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isBannersLoading, setIsBannersLoading] = useState(false);
  const [leaderboardModal, setLeaderboardModal] = useState({ isOpen: false, courseId: "", courseName: "" });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [karmaMap, setKarmaMap] = useState<Record<string, number>>({});
  const [leaderboardDataMap, setLeaderboardDataMap] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();

  const handleViewLeaderboard = (courseId: string, courseName: string) =>
    setLeaderboardModal({ isOpen: true, courseId, courseName });

  const handleCloseLeaderboard = () =>
    setLeaderboardModal({ isOpen: false, courseId: "", courseName: "" });

  useEffect(() => {
    if (!user?.id || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      setIsEnablingNotifications(true);
      Notification.requestPermission()
        .then((p) => setNotificationPermission(p))
        .finally(() => setIsEnablingNotifications(false));
    }
  }, [user]);

  const fetchKarmaData = async (courseIds: string[]) => {
    if (!user?.id || !courseIds.length) return;
    const map: Record<string, number> = {};
    const results = await Promise.all(
      courseIds.map(async (courseId) => {
        const result = await fetchDailyKarmaService.getUserKarmaHistory(user.id, courseId);
        let total = 0;
        if (result.success && result.data) {
          for (const e of result.data) total += e.karmaEarned;
        }
        return { courseId, karma: total };
      })
    );
    for (const { courseId, karma } of results) map[courseId] = karma;
    setKarmaMap(map);
  };

  const fetchLeaderboardData = async (courseIds: string[]) => {
    if (!courseIds.length) return;
    const map: Record<string, boolean> = {};
    const results = await Promise.all(
      courseIds.map(async (courseId) => {
        try {
          const result = await fetchDailyKarmaService.getCourseLeaderboard(courseId, user!.id);
          const has = result.success && result.data && result.data.totalCount > 0 &&
            result.data.leaderboard.some((e) => e.totalKarma > 0);
          return { courseId, hasData: !!has };
        } catch {
          return { courseId, hasData: false };
        }
      })
    );
    for (const { courseId, hasData } of results) map[courseId] = hasData;
    setLeaderboardDataMap(map);
  };

  const fetchBanners = async (courseIds: string[]) => {
    setIsBannersLoading(true);
    const result = courseIds.length
      ? await bannerService.getActiveBannersForUser(courseIds)
      : await bannerService.getActiveGlobalBanners();
    setBanners(result.success ? result.data : []);
    setIsBannersLoading(false);
  };

  const fetchEnrollmentsAndCertificateRequestStatuses = async () => {
    if (!user?.id) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const result = await enrollmentService.getUserEnrollments(user.id);
      if (result.success) {
        setEnrollments(result.data);
        const courseIds = result.data.map((e) => e.courseId);
        const [certResult] = await Promise.all([
          certificateRequestService.getCertificateRequestStatusForCourses(user.id, courseIds),
          fetchBanners(courseIds),
          fetchKarmaData(courseIds),
          fetchLeaderboardData(courseIds),
        ]);
        if (certResult.success) setCertificateStatusMap(certResult.data);
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setEnrollments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollmentsAndCertificateRequestStatuses();
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    if (!user?.id) return;
    if (!("Notification" in window)) {
      toast({ title: "Not supported", description: "Your browser doesn't support notifications.", variant: "destructive" });
      return;
    }
    if (Notification.permission === "denied") {
      toast({ title: "Blocked", description: "Enable in browser settings.", variant: "destructive" });
      return;
    }
    setIsEnablingNotifications(true);
    const p = await Notification.requestPermission();
    setNotificationPermission(p);
    if (p === "granted") toast({ title: "Notifications enabled" });
    setIsEnablingNotifications(false);
  };

  // Computed stats
  const totalKarma = Object.values(karmaMap).reduce((s, k) => s + k, 0);
  const completedCourses = enrollments.filter((e) => !!e.completionDate).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const firstName = user?.firstName || "Learner";

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto relative">
          {/* ── Diagonal gradient background ─────────── */}
          <div
            className="absolute inset-0 pointer-events-none -z-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, hsl(48 69% 89% / 0.3) 40%, hsl(var(--primary) / 0.04) 70%, hsl(48 69% 89% / 0.2) 100%)",
            }}
          />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
            {/* Mobile header */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h1 className="text-lg font-semibold">Dashboard</h1>
              <UserSidebarMobileToggle />
            </div>

            {/* ── Welcome Hero ─────────────────────────── */}
            <div className={`${clay} p-6 sm:p-8 mb-6`}>
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-red-400 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg shadow-primary/20 shrink-0">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={firstName}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    firstName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">{greeting}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                    {firstName} {user?.lastName ?? ""}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {enrollments.length === 0
                      ? "Ready to start your learning journey?"
                      : `You're enrolled in ${enrollments.length} course${enrollments.length > 1 ? "s" : ""}. Keep it up!`}
                  </p>
                </div>

                {/* Desktop actions */}
                <div className="hidden md:flex flex-col gap-2 shrink-0">
                  <Link to="/courses">
                    <Button className="rounded-xl w-full shadow-md shadow-primary/20">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Browse Courses
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={handleEnableNotifications}
                    disabled={notificationPermission === "granted" || isEnablingNotifications}
                  >
                    {notificationPermission === "granted" ? (
                      <Bell className="h-4 w-4 mr-2 text-emerald-500" />
                    ) : (
                      <BellOff className="h-4 w-4 mr-2" />
                    )}
                    <span className="text-xs">
                      {notificationPermission === "granted" ? "Notifications On" : "Enable Notifications"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Stat Cards ──────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <StatCard
                icon={<GraduationCap className="h-6 w-6 text-white" />}
                label="Enrolled Courses"
                value={enrollments.length}
                accent="linear-gradient(135deg, #e43636, #FF5252)"
              />
              <StatCard
                icon={<Flame className="h-6 w-6 text-white" />}
                label="Total Karma"
                value={totalKarma}
                accent="linear-gradient(135deg, #f59e0b, #ef4444)"
              />
              <StatCard
                icon={<Trophy className="h-6 w-6 text-white" />}
                label="Completed"
                value={completedCourses}
                accent="linear-gradient(135deg, #10b981, #06b6d4)"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6 text-white" />}
                label="Certificates"
                value={
                  enrollments.filter((e) => !!e.certification?.certificateId).length
                }
                accent="linear-gradient(135deg, #8b5cf6, #ec4899)"
              />
            </div>

            {/* ── Banners ─────────────────────────────── */}
            {!isBannersLoading && banners.length > 0 && (
              <div className="mb-6">
                <BannerSlider banners={banners} autoSlideInterval={5000} />
              </div>
            )}

            {/* ── Course Section Header ────────────────── */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                My Courses
              </h2>

              {/* Mobile browse button */}
              <Link to="/courses" className="md:hidden">
                <Button size="sm" className="rounded-xl">Browse</Button>
              </Link>
            </div>

            {/* ── Course List ──────────────────────────── */}
            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className={`${clay} h-44 animate-pulse`} />
                ))}
              </div>
            ) : enrollments.length > 0 ? (
              <div className="grid gap-4">
                {enrollments.map((enrollment) => (
                  <EnrolledCourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    certificateStatus={certificateStatusMap[enrollment.courseId] ?? null}
                    fetchEnrollmentsAndCertificateRequestStatuses={fetchEnrollmentsAndCertificateRequestStatuses}
                    karma={karmaMap[enrollment.courseId] || 0}
                    onViewLeaderboard={handleViewLeaderboard}
                    hasLeaderboardData={leaderboardDataMap[enrollment.courseId] || false}
                  />
                ))}
              </div>
            ) : (
              <div className={`${clay} p-10 sm:p-16 text-center`}>
                <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Start your learning journey by enrolling in a course
                </p>
                <Button asChild className="rounded-xl shadow-md shadow-primary/20">
                  <Link to="/courses">Browse Courses</Link>
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

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
