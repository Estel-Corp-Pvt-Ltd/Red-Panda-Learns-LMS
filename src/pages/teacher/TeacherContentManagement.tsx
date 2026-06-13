import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { teacherService, TeacherCourseRef } from "@/services/teacherService";
import { courseService } from "@/services/courseService";
import { contentLockService } from "@/services/contentLockService";
import { organizationService } from "@/services/organizationService";
import { Course, Topic } from "@/types/course";
import { ContentLock } from "@/types/content-lock";
import { LEARNING_UNIT } from "@/constants";
import { Lock, Unlock, Loader2, BookOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ALL = "__ALL__";

const TeacherContentManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [myCourses, setMyCourses] = useState<TeacherCourseRef[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [locks, setLocks] = useState<ContentLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Initial load: teacher's courses + org class/division lists
  useEffect(() => {
    const init = async () => {
      const [coursesResult] = await Promise.all([teacherService.getMyCourses()]);
      const courses = coursesResult.success ? coursesResult.data || [] : [];
      setMyCourses(courses);

      const preselect = searchParams.get("courseId");
      if (preselect && courses.some((c) => c.courseId === preselect)) {
        setSelectedCourseId(preselect);
      } else if (courses.length > 0) {
        setSelectedCourseId(courses[0].courseId);
      }

      if (user?.organizationId) {
        const org = await organizationService.getOrganizationById(user.organizationId);
        if (org) {
          setClasses(org.classes || []);
          setDivisions(org.divisions || []);
        }
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whether a lock matches the currently-selected scope (org + class + division)
  const scopeMatches = useCallback(
    (lock: ContentLock) => {
      if (lock.organizationId !== user?.organizationId) return false;
      const lockClass = lock.class ?? null;
      const lockDiv = lock.division ?? null;
      return lockClass === (selectedClass ?? null) && lockDiv === (selectedDivision ?? null);
    },
    [user?.organizationId, selectedClass, selectedDivision]
  );

  const loadCourseAndLocks = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoadingCourse(true);
    try {
      const fetched = await courseService.getCourseById(selectedCourseId);
      setCourse(fetched);

      if (fetched) {
        const contentIds: string[] = [];
        (fetched.topics || []).forEach((t) => {
          contentIds.push(t.id);
          (t.items || []).forEach((i) => contentIds.push(i.id));
        });
        const locksResult = await contentLockService.getLocksByContentIds(contentIds);
        setLocks(locksResult.success ? locksResult.data || [] : []);
      } else {
        setLocks([]);
      }
    } catch (error) {
      console.error("Failed to load course content:", error);
      toast({ title: "Error", description: "Failed to load course content", variant: "destructive" });
    } finally {
      setLoadingCourse(false);
    }
  }, [selectedCourseId, toast]);

  useEffect(() => {
    loadCourseAndLocks();
  }, [loadCourseAndLocks]);

  // contentId -> the scope-matching lock (if any)
  const lockByContent = useMemo(() => {
    const map = new Map<string, ContentLock>();
    locks.filter(scopeMatches).forEach((l) => map.set(l.contentId, l));
    return map;
  }, [locks, scopeMatches]);

  const isLocked = (contentId: string) => {
    const lock = lockByContent.get(contentId);
    return !!lock && lock.isLocked === true;
  };

  const setLock = async (
    contentId: string,
    contentType: ContentLock["contentType"],
    locked: boolean
  ) => {
    if (!selectedCourseId) return;
    setBusyId(contentId);
    try {
      const existing = lockByContent.get(contentId);
      if (locked) {
        if (existing) {
          const res = await contentLockService.teacherUpdateLock(existing.id, { isLocked: true });
          if (!res.success) throw new Error(res.error?.message);
        } else {
          const res = await contentLockService.teacherCreateLock({
            courseId: selectedCourseId,
            contentType,
            contentId,
            isLocked: true,
            class: selectedClass,
            division: selectedDivision,
          });
          if (!res.success) throw new Error(res.error?.message);
        }
      } else if (existing) {
        // Unlock = remove the scoped lock
        const res = await contentLockService.teacherDeleteLock(existing.id);
        if (!res.success) throw new Error(res.error?.message);
      }
      await loadCourseAndLocks();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lock",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const bulkSetTopic = async (topic: Topic, locked: boolean) => {
    setBusyId(topic.id);
    try {
      // Lock/unlock every lesson item under the topic (sequential to respect the
      // counter transaction used for new lock IDs).
      for (const item of topic.items || []) {
        const existing = lockByContent.get(item.id);
        if (locked) {
          if (existing) {
            await contentLockService.teacherUpdateLock(existing.id, { isLocked: true });
          } else {
            await contentLockService.teacherCreateLock({
              courseId: selectedCourseId,
              contentType: LEARNING_UNIT.LESSON,
              contentId: item.id,
              isLocked: true,
              class: selectedClass,
              division: selectedDivision,
            });
          }
        } else if (existing) {
          await contentLockService.teacherDeleteLock(existing.id);
        }
      }
      await loadCourseAndLocks();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Bulk update failed",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const scopeLabel =
    `${selectedClass ?? "All classes"} · ${selectedDivision ?? "All divisions"}`;

  return (
    <TeacherLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Lock or unlock lessons for a class and division. Locks apply to
            students in your organization.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : myCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">You are not enrolled in any courses</p>
              <p className="text-sm text-muted-foreground">
                You can only manage content for courses you are enrolled in.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Scope selectors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scope</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Course</span>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {myCourses.map((c) => (
                        <SelectItem key={c.courseId} value={c.courseId}>
                          {c.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Class</span>
                  <Select
                    value={selectedClass ?? ALL}
                    onValueChange={(v) => setSelectedClass(v === ALL ? null : v)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All classes</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Division</span>
                  <Select
                    value={selectedDivision ?? ALL}
                    onValueChange={(v) => setSelectedDivision(v === ALL ? null : v)}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>All divisions</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Editing locks for:</span>
              <Badge variant="secondary">{scopeLabel}</Badge>
            </div>

            {/* Course topics / lessons */}
            {loadingCourse ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !course || (course.topics || []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  This course has no topics or lessons.
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {course.topics.map((topic) => {
                  const items = topic.items || [];
                  const lockedCount = items.filter((i) => isLocked(i.id)).length;
                  return (
                    <AccordionItem
                      key={topic.id}
                      value={topic.id}
                      className="rounded-lg border border-border bg-card px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex w-full items-center justify-between pr-3">
                          <span className="font-medium">{topic.title}</span>
                          <Badge variant={lockedCount > 0 ? "destructive" : "secondary"}>
                            {lockedCount}/{items.length} locked
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="mb-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === topic.id}
                            onClick={() => bulkSetTopic(topic, true)}
                          >
                            <Lock className="mr-1 h-3.5 w-3.5" /> Lock all
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === topic.id}
                            onClick={() => bulkSetTopic(topic, false)}
                          >
                            <Unlock className="mr-1 h-3.5 w-3.5" /> Unlock all
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {items.length === 0 ? (
                            <p className="px-1 py-2 text-sm text-muted-foreground">
                              No lessons in this topic.
                            </p>
                          ) : (
                            items.map((item) => {
                              const locked = isLocked(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                                >
                                  <div className="flex items-center gap-2">
                                    {locked ? (
                                      <Lock className="h-4 w-4 text-destructive" />
                                    ) : (
                                      <Unlock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {locked ? "Locked" : "Unlocked"}
                                    </span>
                                    <Switch
                                      checked={locked}
                                      disabled={busyId === item.id}
                                      onCheckedChange={(v) =>
                                        setLock(item.id, LEARNING_UNIT.LESSON, v)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherContentManagement;
