import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PlayCircle, ChevronRight, BookOpen, Code2, Terminal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCourseQuery } from "@/hooks/useCaching";
import { learningProgressService } from "@/services/learningProgressService";
import { LEARNING_UNIT } from "@/constants";
import type { Enrollment } from "@/types/enrollment";
import { toast } from "@/hooks/use-toast";

// ── Floating code decoration ──────────────────────────────────────────────────

function FloatingDecoration() {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-3 pointer-events-none select-none">
      <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 text-xs font-mono text-green-400 leading-relaxed shadow-xl border border-white/10">
        <div><span className="text-purple-400">for</span> i <span className="text-purple-400">in</span> <span className="text-yellow-400">range</span>(5):</div>
        <div className="pl-3"><span className="text-blue-300">print</span>(i)</div>
      </div>
      <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl self-end">
        <Code2 className="h-6 w-6 text-blue-300" />
      </div>
      <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-center border border-white/10 shadow-xl">
        <span className="text-2xl font-bold text-white/80">{"{}"}</span>
      </div>
    </div>
  );
}

// ── Panda mascot ──────────────────────────────────────────────────────────────

function HeroPanda() {
  return (
    <div className="absolute bottom-0 right-[180px] hidden lg:block pointer-events-none select-none">
      <svg viewBox="0 0 140 140" className="h-36 w-36" fill="none">
        <ellipse cx="70" cy="105" rx="38" ry="28" fill="white" />
        <circle cx="70" cy="72" r="38" fill="white" />
        <circle cx="38" cy="42" r="16" fill="#1a1a1a" />
        <circle cx="102" cy="42" r="16" fill="#1a1a1a" />
        <circle cx="38" cy="42" r="8" fill="#FFB6C1" opacity="0.4" />
        <circle cx="102" cy="42" r="8" fill="#FFB6C1" opacity="0.4" />
        <ellipse cx="56" cy="68" rx="13" ry="11" fill="#1a1a1a" />
        <ellipse cx="84" cy="68" rx="13" ry="11" fill="#1a1a1a" />
        <path d="M 49 66 Q 56 58 63 66" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M 77 66 Q 84 58 91 66" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="70" cy="78" rx="6" ry="4" fill="#1a1a1a" />
        <path d="M 57 85 Q 70 98 83 85" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="44" cy="78" r="7" fill="#FFB6C1" opacity="0.5" />
        <circle cx="96" cy="78" r="7" fill="#FFB6C1" opacity="0.5" />
        <rect x="34" y="106" width="72" height="26" rx="4" fill="#e43636" />
        <rect x="38" y="109" width="64" height="19" rx="3" fill="#1a1a1a" />
        <rect x="41" y="111" width="58" height="15" rx="2" fill="#0d0d0d" />
        <rect x="43" y="112" width="54" height="12" rx="1.5" fill="#e43636" opacity="0.35" />
        <ellipse cx="44" cy="110" rx="9" ry="6" fill="#d0d0d0" />
        <ellipse cx="96" cy="110" rx="9" ry="6" fill="#d0d0d0" />
      </svg>
    </div>
  );
}

// ── Connected hero card ───────────────────────────────────────────────────────

interface HeroContinueLearningProps {
  enrollment: Enrollment;
  userId: string;
}

export function HeroContinueLearning({ enrollment, userId }: HeroContinueLearningProps) {
  const navigate = useNavigate();
  const { data: course, isLoading } = useCourseQuery(enrollment.courseId);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState(0);

  const totalLessons =
    course?.topics?.reduce(
      (sum, topic) =>
        sum + (topic.items ? topic.items.filter((i) => i.type === LEARNING_UNIT.LESSON).length : 0),
      0
    ) ?? 0;

  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  useEffect(() => {
    if (!course || !userId) return;
    learningProgressService.getUserCourseProgress(userId, enrollment.courseId).then((result) => {
      if (result.success && result.data[0]) {
        const p = result.data[0];
        const count = Array.isArray(p.lessonHistory)
          ? p.lessonHistory.length
          : Object.values(p.lessonHistory).filter((e) => e.type === LEARNING_UNIT.LESSON).length;
        setCompletedLessons(count);
        setCurrentLessonId(p.currentLessonId ?? null);
      }
    });
  }, [course, userId, enrollment.courseId]);

  const handleContinue = () => {
    if (!course) return;
    const firstId = course.topics?.flatMap((t) => t.items || []).find((i) => i?.id)?.id;
    const target = currentLessonId || firstId;
    if (target) navigate(`/courses/${course.slug || course.id}/lesson/${target}`);
    else toast({ title: "No content available", description: "No lessons yet.", variant: "destructive" });
  };

  if (isLoading) return <div className="rounded-2xl h-48 bg-muted animate-pulse" />;

  const courseName = enrollment.courseName || course?.title || "Your Course";
  const currentLesson = course?.topics
    ?.flatMap((t) => t.items || [])
    .find((i) => i.id === currentLessonId);
  const lessonLabel = currentLesson?.title ?? (completedLessons > 0 ? `Lesson ${completedLessons + 1}` : "Lesson 1");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="relative rounded-2xl overflow-hidden min-h-[180px] sm:min-h-[200px]"
      style={{ background: "linear-gradient(135deg, #e43636 0%, #ff6b35 40%, #ff8c42 70%, #e85d26 100%)" }}
    >
      {/* Overlay pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)" }} />

      {/* Sparkles */}
      <div className="absolute top-4 left-32 text-white/30 text-lg pointer-events-none select-none">✦</div>
      <div className="absolute top-12 left-48 text-white/20 text-sm pointer-events-none select-none">✦</div>
      <div className="absolute bottom-8 left-20 text-white/20 pointer-events-none select-none">✦</div>

      <FloatingDecoration />
      <HeroPanda />

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-7 max-w-[65%] sm:max-w-[58%]">
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-3 border border-white/30">
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Continue Learning</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-1 drop-shadow-sm">
          {courseName}
        </h2>

        <p className="text-sm text-white/80 mb-3 font-medium">{lessonLabel}</p>

        {totalLessons > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex-1 h-2 rounded-full bg-white/30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white shadow-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-white font-bold text-sm shrink-0">{progressPct}%</span>
            </div>
            <p className="text-[11px] text-white/70">{completedLessons} of {totalLessons} lessons complete</p>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="flex items-center gap-2 bg-white text-primary font-bold text-sm rounded-xl px-5 py-2.5 hover:bg-white/90 transition-all duration-150 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlayCircle className="h-4 w-4" />
          Resume Lesson
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function HeroContinueLearningEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative rounded-2xl overflow-hidden min-h-[160px] flex items-center"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div className="relative z-10 p-6 sm:p-8 text-white">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-1">Start your first course!</h2>
        <p className="text-white/80 text-sm mb-4">Browse courses and begin your learning journey.</p>
        <Link to="/courses">
          <button className="flex items-center gap-2 bg-white text-purple-700 font-bold text-sm rounded-xl px-5 py-2.5 hover:bg-white/90 transition-all shadow-lg">
            <BookOpen className="h-4 w-4" />
            Browse Courses
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
