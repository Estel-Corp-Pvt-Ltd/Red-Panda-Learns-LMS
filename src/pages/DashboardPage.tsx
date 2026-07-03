// pages/DashboardPage.tsx — Fully dynamic gamified dashboard

import { Header } from "@/components/Header";
import { StudentSidebar } from "@/components/StudentSidebar";
// Gamification widgets (XP / streak / level / badges / quests / achievements)
// are intentionally hidden until those features are fully released. Components
// are kept in the codebase for reintroduction later.
// import { StatCards } from "@/components/dashboard/StatCards";
import { HeroContinueLearning, HeroContinueLearningEmpty } from "@/components/dashboard/HeroContinueLearning";
// import { DailyQuests } from "@/components/dashboard/DailyQuests";
// import { RecentAchievements } from "@/components/dashboard/RecentAchievements";
// import { UpcomingAssignments } from "@/components/dashboard/UpcomingAssignments";
// import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CERTIFICATE_REQUEST_STATUS, LEARNING_UNIT } from "@/constants";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useGameState } from "@/hooks/useGameState";
import { useCourseQuery } from "@/hooks/useCaching";
import { certificateRequestService } from "@/services/certificate-request-service";
import { enrollmentService } from "@/services/enrollmentService";
import { learningProgressService } from "@/services/learningProgressService";
import { bannerService } from "@/services/bannerService";
import { fetchDailyKarmaService } from "@/services/karmaService/fetchkarmaDaily";
import { streakService } from "@/services/streakService";
import type { Enrollment } from "@/types/enrollment";
import type { Banner } from "@/types/banner";
import type { KarmaDaily } from "@/types/karma";
import type { CertificateRequestStatus } from "@/types/general";
import { formatDate } from "@/utils/date-time";
import {
  BookOpen, CheckCircle, Clock, PlayCircle, MessageSquare,
  Award, Bell, BellOff, Loader2, Flame, Star, Sparkles, ChevronRight,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BannerSlider } from "@/components/BannerSlider";
import Leaderboard from "@/components/Leaderboard";
import CourseCard from "@/components/course/CourseCard";
import { DailyGameCard } from "@/components/games/DailyGameCard";
import { StreakWidget } from "@/components/dashboard/StreakWidget";
import { UpcomingCalendar } from "@/components/dashboard/UpcomingCalendar";

/* ═══════════════════════════════════════════════════════
   Enrolled Course Card (grid) — wraps the standard CourseCard
   so enrolled courses match course listings elsewhere.
   ═══════════════════════════════════════════════════════ */

function EnrolledCourseGridCard({ enrollment }: { enrollment: Enrollment }) {
  const { data: course, isLoading } = useCourseQuery(enrollment.courseId);
  if (isLoading) return <div className="rounded-2xl h-72 bg-muted animate-pulse" />;
  if (!course) return null;
  return <CourseCard course={course} />;
}

/* ═══════════════════════════════════════════════════════
   Leaderboard Modal
   ═══════════════════════════════════════════════════════ */

function LeaderboardModal({ isOpen, onClose, courseId, courseName, currentUserId }: {
  isOpen: boolean; onClose: () => void; courseId: string; courseName: string; currentUserId: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <DialogHeader className="sr-only"><DialogTitle>{courseName} - Leaderboard</DialogTitle></DialogHeader>
        <Leaderboard courseId={courseId} currentUserId={currentUserId} itemsPerPage={15} />
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   Enrolled Course Card
   ═══════════════════════════════════════════════════════ */

function EnrolledCourseCard({ enrollment, certificateStatus, fetchEnrollmentsAndCertificateRequestStatuses, karma, onViewLeaderboard, hasLeaderboardData }: {
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

  const totalLessons = course?.topics?.reduce(
    (sum, topic) => sum + (topic.items ? topic.items.filter((i) => i.type === LEARNING_UNIT.LESSON).length : 0), 0
  ) || 0;

  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  useEffect(() => {
    const fetchLearningProgress = async () => {
      if (enrollment.completionDate) { setIsEligibleForCertificate(true); setIsProgressLoading(false); return; }
      if (!course?.isCertificateEnabled && !course?.isCourseCompletionEnabled) { setIsEligibleForCertificate(false); setIsProgressLoading(false); return; }
      setIsProgressLoading(true);
      const result = await learningProgressService.getUserCourseProgress(enrollment.userId, enrollment.courseId);
      if (result.success && result.data[0]) {
        const p = result.data[0];
        const count = Array.isArray(p.lessonHistory)
          ? p.lessonHistory.length
          : Object.values(p.lessonHistory).filter((e) => e.type === LEARNING_UNIT.LESSON).length;
        setCompletedLessons(count);
        setCurrentLessonId(p.currentLessonId ?? null);
        setIsEligibleForCertificate(totalLessons > 0 && count >= Math.ceil(0.9 * totalLessons));
      }
      setIsProgressLoading(false);
    };
    fetchLearningProgress();
  }, [course]);

  if (isLoading) return <div className="rounded-2xl h-36 bg-muted animate-pulse" />;
  if (!course) return null;

  const handleContinueLearning = () => {
    const firstId = course.topics?.flatMap((t) => t.items || []).find((i) => i?.id)?.id;
    const target = currentLessonId || firstId;
    if (target) navigate(`/courses/${course.slug || course.id}/lesson/${target}`);
    else toast({ title: "No content available", variant: "destructive" });
  };

  const handleCompleteCourse = async () => {
    setIsCompleting(true);
    toast({ title: "Not eligible yet", description: "Please complete more lessons.", variant: "destructive" });
    setIsCompleting(false);
  };

  const showCertificateFeatures = course.isCertificateEnabled;
  const showCourseCompletion = course.isCourseCompletionEnabled ?? true;

  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-[#CFC7F4]/20 border border-border flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary/70" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors truncate">
                {enrollment.courseName || course.title}
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
                {course.description?.replace(/<[^>]+>/g, "")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {karma > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-100 dark:bg-orange-900/20">
                <Flame className="h-3.5 w-3.5 text-[#CFC7F4]" />
                <span className="text-xs font-bold text-[#CFC7F4]">{karma}</span>
              </div>
            )}
            {showCertificateFeatures && (
              <div className="w-7 h-7 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Award className="h-3.5 w-3.5 text-yellow-600" />
              </div>
            )}
          </div>
        </div>

        {totalLessons > 0 && (
          <div className="px-3 py-2.5 rounded-xl bg-muted/40">
            <div className="flex justify-between text-[11px] font-medium mb-1.5">
              <span className="text-muted-foreground">{completedLessons} of {totalLessons} lessons</span>
              <span className={progressPct === 100 ? "text-[#84ff9f] font-bold" : "text-foreground"}>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 rounded-full" />
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Enrolled {formatDate(enrollment.enrollmentDate)}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {hasLeaderboardData && (
              <Button size="sm" variant="ghost" onClick={() => onViewLeaderboard(enrollment.courseId, course.title)}
                className="rounded-xl h-7 px-2.5 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 text-xs">
                <Star className="h-3.5 w-3.5 text-yellow-600" />
                <span className="hidden sm:block ml-1 text-yellow-700 dark:text-yellow-400">Leaderboard</span>
              </Button>
            )}
            {course?.isForumEnabled && (
              <Link to={`/courses/${course.slug}/forum`}>
                <Button size="sm" variant="ghost" className="rounded-xl h-7 px-2.5 text-xs">
                  <MessageSquare className="h-3.5 w-3.5" /><span className="hidden sm:block ml-1">Forum</span>
                </Button>
              </Link>
            )}
            <Button size="sm" onClick={handleContinueLearning}
              className="rounded-xl h-7 px-3 bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 text-xs">
              <PlayCircle className="h-3.5 w-3.5" />
              <span className="ml-1 font-semibold">Continue</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
            {showCourseCompletion && !isProgressLoading && isEligibleForCertificate && !isCompleted && (
              <Button size="sm" onClick={handleCompleteCourse} disabled={isCompleting} className="rounded-xl h-7 px-3 text-xs">
                {isCompleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline ml-1">{isCompleting ? "Completing..." : "Complete"}</span>
              </Button>
            )}
            {showCertificateFeatures && !isProgressLoading && isCompleted && (
              isCertificateIdAvailable ? (
                <Link to={`/certificate/${user.id}_${course.id}/`}>
                  <Button size="sm" className="rounded-xl h-7 px-3 bg-[#84ff9f] hover:bg-[#6ee889] text-foreground text-xs font-bold">
                    <Award className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Certificate</span>
                  </Button>
                </Link>
              ) : (
                <>
                  {certificateStatus === CERTIFICATE_REQUEST_STATUS.PENDING ? (
                    <Badge variant="outline" className="text-[10px] h-7 rounded-xl"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                  ) : certificateStatus === CERTIFICATE_REQUEST_STATUS.APPROVED ? (
                    <Badge variant="secondary" className="text-[10px] h-7 rounded-xl">Generating...</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-xl h-7 px-3 text-xs"
                      onClick={async () => {
                        const res = await certificateRequestService.requestCertificate(enrollment.userId, enrollment.courseId);
                        if (res.success) {
                          toast({ title: "Certificate requested", description: "Pending approval" });
                          fetchEnrollmentsAndCertificateRequestStatuses();
                        } else {
                          toast({ title: "Request failed", description: "Try again later" });
                        }
                      }}>
                      <Award className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Request Cert</span>
                    </Button>
                  )}
                </>
              )
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

  // ── Core data ──────────────────────────────────────────────────────────────
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

  // ── Karma history (for gamification) ─────────────────────────────────────
  const [karmaHistory, setKarmaHistory] = useState<KarmaDaily[]>([]);
  const [todayKarmaEntries, setTodayKarmaEntries] = useState<KarmaDaily[]>([]);
  const [karmaLoading, setKarmaLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Derived game state — fully from real data
  const gameState = useGameState({
    karmaHistory,
    todayKarmaEntries,
    enrollments,
    isLoading: isLoading || karmaLoading,
  });

  const navigate = useNavigate();

  const handleViewLeaderboard = (courseId: string, courseName: string) =>
    setLeaderboardModal({ isOpen: true, courseId, courseName });
  const handleCloseLeaderboard = () =>
    setLeaderboardModal({ isOpen: false, courseId: "", courseName: "" });

  useEffect(() => {
    if (!user?.id || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      setIsEnablingNotifications(true);
      Notification.requestPermission().then((p) => setNotificationPermission(p)).finally(() => setIsEnablingNotifications(false));
    }
  }, [user]);

  const fetchAllKarmaHistory = async (userId: string, courseIds: string[]) => {
    if (!courseIds.length) { setKarmaLoading(false); return; }
    setKarmaLoading(true);
    try {
      const history: KarmaDaily[] = [];
      const today: KarmaDaily[] = [];

      await Promise.all([
        // Historical karma (up to yesterday)
        ...courseIds.map(async (courseId) => {
          const result = await fetchDailyKarmaService.getUserKarmaHistory(userId, courseId);
          if (result.success && result.data) history.push(...result.data);
        }),
        // Today's karma (separate query — history excludes today)
        ...courseIds.map(async (courseId) => {
          const result = await fetchDailyKarmaService.getUserTodayKarma(userId, courseId);
          if (result.success && result.data) today.push(...result.data);
        }),
      ]);

      setKarmaHistory(history);
      setTodayKarmaEntries(today);
    } catch (err) {
      console.error("Karma history fetch failed:", err);
    } finally {
      setKarmaLoading(false);
    }
  };

  const fetchKarmaMap = async (userId: string, courseIds: string[]) => {
    if (!courseIds.length) return;
    const map: Record<string, number> = {};
    await Promise.all(courseIds.map(async (courseId) => {
      const result = await fetchDailyKarmaService.getUserKarmaHistory(userId, courseId);
      map[courseId] = result.success ? (result.data?.reduce((s, e) => s + (e.karmaEarned ?? 0), 0) ?? 0) : 0;
    }));
    setKarmaMap(map);
  };

  const fetchLeaderboardData = async (userId: string, courseIds: string[]) => {
    if (!courseIds.length) return;
    const map: Record<string, boolean> = {};
    await Promise.all(courseIds.map(async (courseId) => {
      try {
        const result = await fetchDailyKarmaService.getCourseLeaderboard(courseId, userId);
        map[courseId] = !!(result.success && result.data?.totalCount > 0 && result.data.leaderboard.some((e) => e.totalKarma > 0));
      } catch { map[courseId] = false; }
    }));
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
          fetchKarmaMap(user.id, courseIds),
          fetchLeaderboardData(user.id, courseIds),
          fetchAllKarmaHistory(user.id, courseIds),
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
    streakService.getStreak().then((r) => {
      if (r.success && r.data) setStreak(r.data.current);
    });
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    if (!user?.id) return;
    if (!("Notification" in window)) {
      toast({ title: "Not supported", variant: "destructive" }); return;
    }
    if (Notification.permission === "denied") {
      toast({ title: "Blocked", description: "Enable in browser settings.", variant: "destructive" }); return;
    }
    setIsEnablingNotifications(true);
    const p = await Notification.requestPermission();
    setNotificationPermission(p);
    if (p === "granted") toast({ title: "Notifications enabled" });
    setIsEnablingNotifications(false);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const firstName = user?.firstName || "Learner";
  const firstEnrollment = enrollments[0] ?? null;

  // Compute which days of the current Mon–Sun had karma activity
  const activeDaysThisWeek = useMemo<boolean[]>(() => {
    const allEntries = [...karmaHistory, ...todayKarmaEntries];
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayStr = day.toDateString();
      return allEntries.some((e) => {
        try {
          const d = e.date && typeof e.date === "object" && "toDate" in (e.date as object)
            ? (e.date as any).toDate().toDateString()
            : new Date(e.date as string).toDateString();
          return d === dayStr;
        } catch { return false; }
      });
    });
  }, [karmaHistory, todayKarmaEntries]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <StudentSidebar streak={gameState.streak} activeDaysThisWeek={activeDaysThisWeek} />

        <main className="flex-1 overflow-y-auto">
          <div
            className="fixed inset-0 pointer-events-none -z-0"
            style={{ background: "linear-gradient(135deg, rgba(184,173,238,0.05) 0%, rgba(184,173,238,0.07) 50%, transparent 100%)" }}
          />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7 space-y-5">

            {/* ── Welcome row ──────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#CFC7F4] flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                  {user?.photoURL
                    ? <img src={user.photoURL} alt={firstName} className="w-full h-full rounded-xl object-cover" />
                    : `${firstName.charAt(0)}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase()
                  }
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">{greeting}</span>
                  </div>
                  <h1 className="text-base sm:text-xl font-bold text-foreground leading-tight">
                    Welcome back, {firstName}!
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 h-8"
                  title={`${streak}-day streak — complete a lesson, quiz, or assignment each day to keep it going`}
                >
                  <Flame className={`h-4 w-4 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-bold text-foreground">{streak}</span>
                  <span className="hidden sm:inline text-xs text-muted-foreground">day streak</span>
                </div>
                <Button variant="ghost" size="sm" className="hidden md:inline-flex rounded-xl text-xs h-8"
                  onClick={handleEnableNotifications}
                  disabled={notificationPermission === "granted" || isEnablingNotifications}>
                  {notificationPermission === "granted"
                    ? <Bell className="h-4 w-4 mr-1.5 text-[#84ff9f]" />
                    : <BellOff className="h-4 w-4 mr-1.5" />}
                  {notificationPermission === "granted" ? "Notifications On" : "Enable Notifications"}
                </Button>
                <Link to="/courses" className="hidden md:block">
                  <Button className="rounded-xl text-xs h-8 shadow-sm shadow-primary/20">
                    <BookOpen className="h-4 w-4 mr-1.5" />Browse Courses
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Bento layout (responsive grid) ─────────────────────────────── */}
            <div className="space-y-5 min-w-0">

              {/* Bento row 1: hero + game/streak (responsively sized) */}
              {/* lg: hero 2/3 + right col 1/3 stacked (game+streak); md: hero full width then game+streak side; sm: all stack */}
              <div className="grid items-stretch gap-4 lg:grid-cols-3 md:grid-cols-2">
                <div className="lg:col-span-2 md:col-span-2">
                  {isLoading ? (
                    <div className="rounded-2xl h-48 bg-muted animate-pulse" />
                  ) : firstEnrollment ? (
                    <HeroContinueLearning enrollment={firstEnrollment} userId={user?.id ?? ""} />
                  ) : (
                    <HeroContinueLearningEmpty />
                  )}
                </div>
                <div className="lg:col-span-1 md:col-span-1 flex flex-col gap-4">
                  <DailyGameCard />
                  <StreakWidget />
                </div>
              </div>

              {/* Banners */}
              {!isBannersLoading && banners.length > 0 && (
                <BannerSlider banners={banners} autoSlideInterval={5000} />
              )}

              {/* Bento row 2: calendar + empty space (responsively sized) */}
              <div className="grid items-stretch gap-4 lg:grid-cols-3 md:grid-cols-2">
                <div className="lg:col-span-1 md:col-span-1">
                  <UpcomingCalendar />
                </div>
                <div className="lg:col-span-2 md:col-span-1 hidden md:block" />
              </div>

              {/* Bento row 3: courses (full width, dynamic grid) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />Your Courses
                  </h2>
                  <Link to="/courses">
                    <Button size="sm" variant="ghost" className="rounded-xl text-xs h-7">
                      View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </Link>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-2xl h-72 bg-muted animate-pulse" />)}
                  </div>
                ) : enrollments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {enrollments.map((enrollment) => (
                      <EnrolledCourseGridCard key={enrollment.id} enrollment={enrollment} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-card border border-border p-10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-base font-bold mb-1">No courses yet</h3>
                    <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
                      Start your learning journey by enrolling in a course
                    </p>
                    <Button asChild className="rounded-xl shadow-sm shadow-primary/20">
                      <Link to="/courses">Browse Courses</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
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
