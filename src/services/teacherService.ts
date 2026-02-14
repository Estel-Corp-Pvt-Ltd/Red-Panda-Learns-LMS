import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  WhereFilterOp,
} from "firebase/firestore";

import { COLLECTION, USER_ROLE } from "@/constants";
import { db } from "@/firebaseConfig";
import { User } from "@/types/user";
import { AssignmentSubmission } from "@/types/assignment";
import { Comment } from "@/types/comment";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import { Result, ok, fail } from "@/utils/response";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { logError } from "@/utils/logger";
import { userService } from "./userService";

class TeacherService {
  /**
   * Get all students belonging to the teacher's organization.
   */
  async getOrganizationStudents(
    organizationId: string,
    options: PaginationOptions<User> = {}
  ): Promise<Result<PaginatedResult<User>>> {
    return userService.getUsersByOrganization(
      organizationId,
      USER_ROLE.STUDENT,
      options
    );
  }

  /**
   * Get all student IDs in the organization (non-paginated).
   * Used for filtering submissions, comments, enrollments.
   */
  async getOrganizationStudentIds(
    organizationId: string
  ): Promise<Result<string[]>> {
    return userService.getOrganizationUserIds(
      organizationId,
      USER_ROLE.STUDENT
    );
  }

  /**
   * Get assignment submissions from organization students.
   * Batches queries due to Firestore "in" limit of 30 items.
   */
  async getOrganizationSubmissions(
    organizationId: string
  ): Promise<Result<AssignmentSubmission[]>> {
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
      const allSubmissions: AssignmentSubmission[] = [];

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batch = studentIds.slice(i, i + BATCH_SIZE);
        const q = query(
          collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS),
          where("studentId", "in", batch),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const submissions = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            assignmentId: data.assignmentId,
            assignmentTitle: data.assignmentTitle || "",
            courseId: data.courseId,
            studentId: data.studentId,
            studentName: data.studentName,
            studentEmail: data.studentEmail,
            submissionFiles: data.submissionFiles || [],
            textSubmissions: data.textSubmissions || [],
            links: data.links || [],
            marks: data.marks,
            feedback: data.feedback,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as AssignmentSubmission;
        });

        allSubmissions.push(...submissions);
      }

      // Sort all by createdAt descending
      allSubmissions.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return ok(allSubmissions);
    } catch (error) {
      logError("TeacherService.getOrganizationSubmissions", error);
      return fail("Failed to fetch organization submissions");
    }
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
   * Get enrollments for organization students.
   * Optionally filter by courseId.
   */
  async getOrganizationEnrollments(
    organizationId: string,
    courseId?: string
  ): Promise<Result<Enrollment[]>> {
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
      const allEnrollments: Enrollment[] = [];

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batch = studentIds.slice(i, i + BATCH_SIZE);
        const constraints: any[] = [
          where("userId", "in", batch),
        ];

        if (courseId) {
          constraints.push(where("courseId", "==", courseId));
        }

        const q = query(
          collection(db, COLLECTION.ENROLLMENTS),
          ...constraints
        );

        const snapshot = await getDocs(q);
        const enrollments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            enrollmentDate: data.enrollmentDate?.toDate(),
            completionDate: data.completionDate?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Enrollment;
        });

        allEnrollments.push(...enrollments);
      }

      return ok(allEnrollments);
    } catch (error) {
      logError("TeacherService.getOrganizationEnrollments", error);
      return fail("Failed to fetch organization enrollments");
    }
  }

  /**
   * Get learning progress for a specific student in a specific course.
   */
  async getStudentCourseProgress(
    userId: string,
    courseId: string
  ): Promise<Result<LearningProgress | null>> {
    try {
      const q = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return ok(null);
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      return ok({
        id: doc.id,
        ...data,
        lastAccessed: data.lastAccessed?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as LearningProgress);
    } catch (error) {
      logError("TeacherService.getStudentCourseProgress", error);
      return fail("Failed to fetch student course progress");
    }
  }

  /**
   * Get learning progress for all organization students in a specific course.
   * Batches queries due to Firestore "in" limit of 30 items.
   */
  async getOrganizationCourseProgress(
    organizationId: string,
    courseId: string
  ): Promise<Result<LearningProgress[]>> {
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
      const allProgress: LearningProgress[] = [];

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batch = studentIds.slice(i, i + BATCH_SIZE);
        const q = query(
          collection(db, COLLECTION.LEARNING_PROGRESS),
          where("userId", "in", batch),
          where("courseId", "==", courseId)
        );

        const snapshot = await getDocs(q);
        const progress = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastAccessed: data.lastAccessed?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as LearningProgress;
        });

        allProgress.push(...progress);
      }

      return ok(allProgress);
    } catch (error) {
      logError("TeacherService.getOrganizationCourseProgress", error);
      return fail("Failed to fetch organization course progress");
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
      const [studentsResult, submissionsResult, commentsResult] =
        await Promise.all([
          this.getOrganizationStudentIds(organizationId),
          this.getOrganizationSubmissions(organizationId),
          this.getOrganizationComments(organizationId, "PENDING"),
        ]);

      const totalStudents = studentsResult.success
        ? studentsResult.data?.length || 0
        : 0;

      const pendingSubmissions = submissionsResult.success
        ? (submissionsResult.data?.filter(
            (s) => s.marks === undefined || s.marks === null
          ).length || 0)
        : 0;

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
    try {
      const usersRef = collection(db, COLLECTION.USERS);
      const q = query(
        usersRef,
        where("organizationId", "==", organizationId),
        where("role", "==", USER_ROLE.STUDENT)
      );
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as User;
      });
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
    endDate: Date
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

      const BATCH_SIZE = 30;
      const allProgress: LearningProgress[] = [];

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batch = studentIds.slice(i, i + BATCH_SIZE);
        const q = query(
          collection(db, COLLECTION.LEARNING_PROGRESS),
          where("userId", "in", batch)
        );

        const snapshot = await getDocs(q);
        const progress = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastAccessed: data.lastAccessed?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as LearningProgress;
        });

        allProgress.push(...progress);
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
