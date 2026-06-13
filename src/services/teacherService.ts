import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";

import { COLLECTION } from "@/constants";
import { db } from "@/firebaseConfig";
import { User } from "@/types/user";
// import { AssignmentSubmission } from "@/types/assignment";
import { Comment } from "@/types/comment";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import { Result, ok, fail } from "@/utils/response";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { logError } from "@/utils/logger";
import { authService } from "./authService";

/** Teacher's own enrolled course (from /teacher/my-courses). */
export interface TeacherCourseRef {
  courseId: string;
  courseName: string;
  slug: string;
}

class TeacherService {
  private readonly backendUrl = import.meta.env.VITE_BACKEND_URL;

  /**
   * Authenticated GET against the Worker teacher endpoints.
   * Returns the parsed `data` array/object; throws on non-2xx.
   */
  private async authedGet<T>(path: string): Promise<T> {
    const idToken = await authService.getToken();
    const res = await fetch(`${this.backendUrl}${path}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error || `Request failed: ${res.status}`);
    }
    const json = await res.json();
    return (json as any).data as T;
  }

  /** Coerce an ISO string / Firestore value to a Date (or null). */
  private toDate(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === "object" && typeof (v as any).toDate === "function") {
      return (v as any).toDate();
    }
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
  }
  /**
   * Get the teacher's OWN enrolled courses. This set defines which student
   * course data the teacher is allowed to access. Server-enforced.
   */
  async getMyCourses(): Promise<Result<TeacherCourseRef[]>> {
    try {
      const data = await this.authedGet<TeacherCourseRef[]>("/teacher/my-courses");
      return ok(data ?? []);
    } catch (error) {
      logError("TeacherService.getMyCourses", error);
      return fail("Failed to fetch your courses");
    }
  }

  /**
   * Get all students belonging to the teacher's organization.
   * Routed through the Worker (org-scope enforced server-side). Pagination is
   * applied client-side over the full org list.
   */
  async getOrganizationStudents(
    organizationId: string,
    options: PaginationOptions<User> = {}
  ): Promise<Result<PaginatedResult<User>>> {
    void organizationId; // org is derived server-side from the auth token
    try {
      const all = await this.fetchOrgStudents();
      const perPage = options.limit ?? all.length;
      const page = all.slice(0, perPage);
      return ok({
        data: page,
        hasNextPage: all.length > perPage,
        hasPreviousPage: false,
        nextCursor: null,
        previousCursor: null,
        totalCount: all.length,
      });
    } catch (error) {
      logError("TeacherService.getOrganizationStudents", error);
      return fail("Failed to fetch organization students");
    }
  }

  /**
   * Get all student IDs in the organization (non-paginated).
   * Used for filtering comments. Org-scope enforced server-side.
   */
  async getOrganizationStudentIds(
    organizationId: string
  ): Promise<Result<string[]>> {
    void organizationId;
    try {
      const all = await this.fetchOrgStudents();
      return ok(all.map((s) => s.id));
    } catch (error) {
      logError("TeacherService.getOrganizationStudentIds", error);
      return fail("Failed to fetch organization student IDs");
    }
  }

  /** Internal: fetch the full org student list from the Worker, dates normalized. */
  private async fetchOrgStudents(): Promise<User[]> {
    const raw = await this.authedGet<any[]>("/teacher/students");
    return (raw ?? []).map((s) => ({
      ...s,
      createdAt: this.toDate(s.createdAt),
      updatedAt: this.toDate(s.updatedAt),
    })) as User[];
  }

  // getOrganizationSubmissions — disabled (assignment feature removed)
  async getOrganizationSubmissions(_organizationId: string): Promise<Result<never[]>> {
    return ok([] as never[]);
  }

  /**
   * Get comments from organization students.
   * Batches queries due to Firestore "in" limit of 30 items.
   */
  async getOrganizationComments(
    organizationId: string,
    statusFilter?: string
  ): Promise<Result<Comment[]>> {
    try {
      const idsResult = await this.getOrganizationStudentIds(organizationId);
      if (!idsResult.success || !idsResult.data) {
        return fail("Failed to fetch organization student IDs");
      }

      const studentIds = idsResult.data;
      if (studentIds.length === 0) {
        return ok([]);
      }

      const BATCH_SIZE = 30;
      const allComments: Comment[] = [];

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batch = studentIds.slice(i, i + BATCH_SIZE);
        const constraints: any[] = [
          where("userId", "in", batch),
        ];

        if (statusFilter) {
          constraints.push(where("status", "==", statusFilter));
        }

        constraints.push(orderBy("createdAt", "desc"));

        const q = query(
          collection(db, COLLECTION.COMMENTS),
          ...constraints
        );

        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Comment;
        });

        allComments.push(...comments);
      }

      // Sort all by createdAt descending
      allComments.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return ok(allComments);
    } catch (error) {
      logError("TeacherService.getOrganizationComments", error);
      return fail("Failed to fetch organization comments");
    }
  }

  /**
   * Get enrollments for organization students (optionally for one course).
   * Routed through the Worker: org-scope + course-enrollment gate enforced
   * server-side. Returns [] (not an error) when the teacher is not enrolled in
   * the requested course is handled by the caller via the 403 path.
   */
  async getOrganizationEnrollments(
    organizationId: string,
    courseId?: string
  ): Promise<Result<Enrollment[]>> {
    void organizationId;
    try {
      const path = courseId
        ? `/teacher/enrollments?courseId=${encodeURIComponent(courseId)}`
        : "/teacher/enrollments";
      const raw = await this.authedGet<any[]>(path);
      const enrollments = (raw ?? []).map((e) => ({
        ...e,
        enrollmentDate: this.toDate(e.enrollmentDate),
        completionDate: this.toDate(e.completionDate),
        createdAt: this.toDate(e.createdAt),
        updatedAt: this.toDate(e.updatedAt),
      })) as Enrollment[];
      return ok(enrollments);
    } catch (error) {
      logError("TeacherService.getOrganizationEnrollments", error);
      return fail(error instanceof Error ? error.message : "Failed to fetch organization enrollments");
    }
  }

  /**
   * Get learning progress for a specific student in a specific course.
   * Uses the gated course-progress endpoint and selects the student.
   */
  async getStudentCourseProgress(
    userId: string,
    courseId: string
  ): Promise<Result<LearningProgress | null>> {
    try {
      const raw = await this.authedGet<any[]>(
        `/teacher/course-progress?courseId=${encodeURIComponent(courseId)}`
      );
      const match = (raw ?? []).find((p) => p.userId === userId);
      if (!match) return ok(null);
      return ok({
        ...match,
        lastAccessed: this.toDate(match.lastAccessed),
        updatedAt: this.toDate(match.updatedAt),
      } as LearningProgress);
    } catch (error) {
      logError("TeacherService.getStudentCourseProgress", error);
      return fail(error instanceof Error ? error.message : "Failed to fetch student course progress");
    }
  }

  /**
   * Get learning progress for all organization students in a specific course.
   * Routed through the Worker (course-enrollment gate enforced server-side).
   */
  async getOrganizationCourseProgress(
    organizationId: string,
    courseId: string
  ): Promise<Result<LearningProgress[]>> {
    void organizationId;
    try {
      const raw = await this.authedGet<any[]>(
        `/teacher/course-progress?courseId=${encodeURIComponent(courseId)}`
      );
      const progress = (raw ?? []).map((p) => ({
        ...p,
        lastAccessed: this.toDate(p.lastAccessed),
        updatedAt: this.toDate(p.updatedAt),
      })) as LearningProgress[];
      return ok(progress);
    } catch (error) {
      logError("TeacherService.getOrganizationCourseProgress", error);
      return fail(error instanceof Error ? error.message : "Failed to fetch organization course progress");
    }
  }

  /**
   * Get counts for dashboard statistics.
   */
  async getDashboardStats(organizationId: string): Promise<
    Result<{
      totalStudents: number;
      pendingSubmissions: number;
      pendingComments: number;
    }>
  > {
    try {
      const [studentsResult, commentsResult] =
        await Promise.all([
          this.getOrganizationStudentIds(organizationId),
          this.getOrganizationComments(organizationId, "PENDING"),
        ]);

      const totalStudents = studentsResult.success
        ? studentsResult.data?.length || 0
        : 0;

      const pendingSubmissions = 0; // assignment feature disabled

      const pendingComments = commentsResult.success
        ? commentsResult.data?.length || 0
        : 0;

      return ok({
        totalStudents,
        pendingSubmissions,
        pendingComments,
      });
    } catch (error) {
      logError("TeacherService.getDashboardStats", error);
      return fail("Failed to fetch dashboard stats");
    }
  }
  /**
   * Get all students in the organization with full user data (non-paginated).
   * Used for client-side class/division filtering.
   */
  async getAllOrganizationStudents(
    organizationId: string
  ): Promise<Result<User[]>> {
    void organizationId; // org derived server-side from auth token
    try {
      const students = await this.fetchOrgStudents();
      return ok(students);
    } catch (error) {
      logError("TeacherService.getAllOrganizationStudents", error);
      return fail("Failed to fetch organization students");
    }
  }

  /**
   * Get progress statistics for a specific time period.
   * Analyzes lesson completions grouped by month within the date range.
   */
  async getProgressStatistics(
    studentIds: string[],
    startDate: Date,
    endDate: Date,
    courseId?: string
  ): Promise<
    Result<{
      totalLessonsCompleted: number;
      monthlyBreakdown: Array<{
        month: string;
        completions: number;
        avgCompletionsPerStudent: number;
      }>;
      studentProgress: Array<{
        studentId: string;
        lessonsCompleted: number;
        totalTimeSpent: number;
      }>;
    }>
  > {
    try {
      if (studentIds.length === 0) {
        return ok({
          totalLessonsCompleted: 0,
          monthlyBreakdown: [],
          studentProgress: [],
        });
      }

      // Routed through the Worker: returns progress for org students restricted
      // to courses the teacher can access. lessonHistory.completedAt arrives as
      // ISO strings, handled below by the `new Date(...)` fallback.
      const raw = await this.authedGet<any[]>("/teacher/progress");
      let allProgress = (raw ?? []) as LearningProgress[];

      // Restrict the aggregation to the selected students + (optional) course.
      const studentIdSet = new Set(studentIds);
      allProgress = allProgress.filter((p) => studentIdSet.has(p.userId));
      if (courseId) {
        allProgress = allProgress.filter((p) => p.courseId === courseId);
      }

      const monthlyMap = new Map<string, number>();
      const studentProgressMap = new Map<
        string,
        { lessonsCompleted: number; totalTimeSpent: number }
      >();

      let totalLessonsCompleted = 0;

      allProgress.forEach((progress) => {
        const lessons = Object.values(progress.lessonHistory || {});
        let studentLessons = 0;
        let studentTime = 0;

        lessons.forEach((lesson) => {
          studentTime += lesson.timeSpent || 0;

          if (lesson.markedAsComplete && lesson.completedAt) {
            const completedDate =
              (lesson.completedAt as any)?.toDate?.() ||
              new Date(lesson.completedAt as any);

            if (completedDate >= startDate && completedDate <= endDate) {
              totalLessonsCompleted++;
              studentLessons++;

              const monthKey = `${completedDate.getFullYear()}-${String(
                completedDate.getMonth() + 1
              ).padStart(2, "0")}`;
              monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
            }
          }
        });

        const existing = studentProgressMap.get(progress.userId);
        if (existing) {
          studentProgressMap.set(progress.userId, {
            lessonsCompleted: existing.lessonsCompleted + studentLessons,
            totalTimeSpent: existing.totalTimeSpent + studentTime,
          });
        } else {
          studentProgressMap.set(progress.userId, {
            lessonsCompleted: studentLessons,
            totalTimeSpent: studentTime,
          });
        }
      });

      const studentCount = studentIds.length;
      const monthlyBreakdown = Array.from(monthlyMap.entries())
        .map(([month, completions]) => ({
          month,
          completions,
          avgCompletionsPerStudent:
            studentCount > 0
              ? Math.round((completions / studentCount) * 10) / 10
              : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const studentProgress = Array.from(studentProgressMap.entries()).map(
        ([studentId, data]) => ({
          studentId,
          lessonsCompleted: data.lessonsCompleted,
          totalTimeSpent: data.totalTimeSpent,
        })
      );

      return ok({
        totalLessonsCompleted,
        monthlyBreakdown,
        studentProgress,
      });
    } catch (error) {
      logError("TeacherService.getProgressStatistics", error);
      return fail("Failed to fetch progress statistics");
    }
  }
}

export const teacherService = new TeacherService();
