import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TeacherLayout from "@/components/TeacherLayout";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Loader2,
  Unlock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { courseService } from "@/services/courseService";
import { contentLockService } from "@/services/contentLockService";
import { teacherService } from "@/services/teacherService";
import { Course, Topic, TopicItem } from "@/types/course";
import { ContentLock } from "@/types/content-lock";
import { User } from "@/types/user";
import { LEARNING_UNIT } from "@/constants";
import { cn } from "@/lib/utils";

export default function TeacherContentManagement() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    searchParams.get("courseId") ?? ""
  );
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [locks, setLocks] = useState<ContentLock[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocksLoading, setIsLocksLoading] = useState(false);

  /* ── Derived: class/division options from student data ─────────────── */
  const classes = useMemo(() => {
    const s = new Set<string>();
    allStudents.forEach((u) => u.class && s.add(u.class));
    return Array.from(s).sort();
  }, [allStudents]);

  const divisions = useMemo(() => {
    const s = new Set<string>();
    allStudents
      .filter((u) => selectedClass === "all" || u.class === selectedClass)
      .forEach((u) => u.division && s.add(u.division));
    return Array.from(s).sort();
  }, [allStudents, selectedClass]);

  /* ── Selected course ─────────────────────────────────────────────── */
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  /* ── Lock map: contentId → ContentLock ──────────────────────────── */
  const lockMap = useMemo(() => {
    const m = new Map<string, ContentLock>();
    locks.forEach((l) => m.set(l.contentId, l));
    return m;
  }, [locks]);

  /* ── Initial data load ───────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [coursesData, studentsResult] = await Promise.all([
        courseService.getPublishedCourses(),
        user?.organizationId
          ? teacherService.getAllOrganizationStudents(user.organizationId)
          : Promise.resolve({ success: false, data: [] as User[] }),
      ]);
      setCourses(coursesData);
      if (studentsResult.success && studentsResult.data) {
        setAllStudents(studentsResult.data);
      }
      setIsLoading(false);
    };
    load();
  }, [user?.organizationId]);

  /* ── Reload locks when filter changes ───────────────────────────── */
  useEffect(() => {
    if (!user?.organizationId) return;
    const loadLocks = async () => {
      setIsLocksLoading(true);
      const result = await contentLockService.getLocksForOrganization(
        user.organizationId!,
        selectedClass !== "all" ? selectedClass : undefined,
        selectedDivision !== "all" ? selectedDivision : undefined
      );
      if (result.success && result.data) setLocks(result.data);
      setIsLocksLoading(false);
    };
    loadLocks();
  }, [user?.organizationId, selectedClass, selectedDivision]);

  /* ── Toggle lock for a lesson item ─────────────────────────────── */
  const handleToggleLock = useCallback(
    async (item: TopicItem, currentlyLocked: boolean) => {
      if (!user?.organizationId) return;
      setTogglingId(item.id);

      const existingLock = lockMap.get(item.id);

      if (existingLock) {
        await contentLockService.updateContentLock(existingLock.id, {
          isLocked: !currentlyLocked,
        });
        setLocks((prev) =>
          prev.map((l) =>
            l.id === existingLock.id ? { ...l, isLocked: !currentlyLocked } : l
          )
        );
      } else {
        const result = await contentLockService.createContentLock({
          contentType: LEARNING_UNIT.LESSON,
          contentId: item.id,
          organizationId: user.organizationId,
          class: selectedClass !== "all" ? selectedClass : undefined,
          division: selectedDivision !== "all" ? selectedDivision : undefined,
          isLocked: true,
          appliesToAllUsers: selectedClass === "all" && selectedDivision === "all",
        });
        if (result.success && result.data) {
          const newLock: ContentLock = {
            id: result.data,
            contentType: LEARNING_UNIT.LESSON,
            contentId: item.id,
            organizationId: user.organizationId,
            class: selectedClass !== "all" ? selectedClass : undefined,
            division: selectedDivision !== "all" ? selectedDivision : undefined,
            isLocked: true,
            appliesToAllUsers: selectedClass === "all" && selectedDivision === "all",
            createdAt: new Date() as any,
            updatedAt: new Date() as any,
          };
          setLocks((prev) => [...prev, newLock]);
        }
      }

      setTogglingId(null);
    },
    [lockMap, user?.organizationId, selectedClass, selectedDivision]
  );

  /* ── Toggle topic expand ─────────────────────────────────────────── */
  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lock or unlock lessons for specific classes and divisions in your
          organization.
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-card/80 border-border/40">
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Course picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Course
              </label>
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Select a course…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Class
              </label>
              <Select
                value={selectedClass}
                onValueChange={(v) => {
                  setSelectedClass(v);
                  setSelectedDivision("all");
                }}
              >
                <SelectTrigger className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Division picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Division
              </label>
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
                disabled={selectedClass === "all"}
              >
                <SelectTrigger className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      Division {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active scope badge */}
          {(selectedClass !== "all" || selectedDivision !== "all") && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>Locks apply to:</span>
              {selectedClass !== "all" && (
                <Badge variant="secondary" className="text-[10px]">
                  Class {selectedClass}
                </Badge>
              )}
              {selectedDivision !== "all" && (
                <Badge variant="secondary" className="text-[10px]">
                  Div {selectedDivision}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course content */}
      {!selectedCourse ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Select a course above to manage its content locks.
        </div>
      ) : (
        <div className="space-y-3">
          {isLocksLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading locks…</span>
            </div>
          )}

          {selectedCourse.topics.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              This course has no topics yet.
            </div>
          ) : (
            selectedCourse.topics.map((topic: Topic) => {
              const isExpanded = expandedTopics.has(topic.id);
              const lockedCount = topic.items.filter((i) =>
                lockMap.get(i.id)?.isLocked
              ).length;

              return (
                <Card
                  key={topic.id}
                  className="bg-card/80 border-border/40 overflow-hidden"
                >
                  {/* Topic header */}
                  <button
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 font-medium text-sm">
                      {topic.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {topic.items.length} items
                    </span>
                    {lockedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/10 ml-1"
                      >
                        {lockedCount} locked
                      </Badge>
                    )}
                  </button>

                  {/* Topic items */}
                  {isExpanded && (
                    <div className="border-t border-border/30 divide-y divide-border/20">
                      {topic.items.length === 0 ? (
                        <p className="px-5 py-3 text-xs text-muted-foreground italic">
                          No items in this topic.
                        </p>
                      ) : (
                        topic.items.map((item: TopicItem) => {
                          const lock = lockMap.get(item.id);
                          const isLocked = lock?.isLocked ?? false;
                          const isToggling = togglingId === item.id;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-center gap-3 px-5 py-3 transition-colors",
                                isLocked && "bg-amber-500/5"
                              )}
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              )}

                              <span className="flex-1 text-sm text-foreground/90 truncate">
                                {item.title}
                              </span>

                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground border-border/40 capitalize"
                              >
                                {item.type.toLowerCase().replace("_", " ")}
                              </Badge>

                              <div className="flex items-center gap-2 ml-2">
                                {isToggling ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                ) : (
                                  <Switch
                                    checked={isLocked}
                                    onCheckedChange={() =>
                                      handleToggleLock(item, isLocked)
                                    }
                                    aria-label={`${isLocked ? "Unlock" : "Lock"} ${item.title}`}
                                  />
                                )}
                                <span className="text-xs text-muted-foreground w-12">
                                  {isLocked ? "Locked" : "Open"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
    </TeacherLayout>
  );
}
