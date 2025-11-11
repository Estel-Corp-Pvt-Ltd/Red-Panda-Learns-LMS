// ───────────────────────────────────────────────
// LessonService – Safe, consistent Firestore CRUD
// ───────────────────────────────────────────────

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  runTransaction,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  limitToLast,
  endBefore,
  Query,
  WhereFilterOp,
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { Lesson } from "@/types/lesson";
import { ok, fail, Result } from "@/utils/response";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { COLLECTION, ENVIRONMENT } from "@/constants";
import { Duration } from "@/types/general";
import { logError } from "@/utils/logger";
import { authService } from "./authService";
/** Deep‑cleans objects before sending to Firestore */
function deepClean(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepClean);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined && !Number.isNaN(v))
        .map(([k, v]) => [k, deepClean(v)])
    );
  }
  return obj;
}

class LessonService {
  private readonly backendUrl = import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.DEVELOPMENT ?
    import.meta.env.VITE_DEV_BACKEND_URL :
    import.meta.env.VITE_PROD_BACKEND_URL;
  // ───────────────────────────────────────────────
  private async generateLessonId(): Promise<string> {
    const counterRef = doc(db, COLLECTION.COUNTERS, "lessonCounter");

    const newId = await runTransaction(db, async (tx) => {
      const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
      const counterDoc = await tx.get(counterRef);
      const lastNumber = counterDoc.exists()
        ? counterDoc.data().lastNumber
        : 30000000;

      const nextNumber = lastNumber + gap;
      tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      return nextNumber;
    });

    return `lesson_${newId}`;
  }

  // ───────────────────────────────────────────────
  async createLesson(
    data: Omit<Lesson, "id" | "createdAt" | "updatedAt">
  ): Promise<Lesson> {
    try {
      const lessonId = await this.generateLessonId();

      const lesson: Lesson = {
        id: lessonId,
        courseId: data.courseId,
        title: data.title,
        type: data.type,
        description: data.description || "",
        embedUrl: data.embedUrl || "",
        duration: {
          hours: data.duration?.hours ?? 0,
          minutes: data.duration?.minutes ?? 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.LESSONS, lessonId), lesson);

      return lesson;
    } catch (err) {
      console.error("❌ LessonService.createLesson:", err);
      throw new Error("Failed to create lesson");
    }
  }

  // ───────────────────────────────────────────────
  async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Result<void>> {
    try {
      const lessonRef = doc(db, COLLECTION.LESSONS, lessonId);
      const lessonDoc = await getDoc(lessonRef);

      if (!lessonDoc.exists()) {
        throw new Error("Lesson not found");
      }

      const lessonData = lessonDoc.data() as Lesson;

      // Base update object
      const updateData: Partial<Lesson> = {
        updatedAt: serverTimestamp(),
      };

      // Handle scalar fields
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.embedUrl !== undefined) updateData.embedUrl = updates.embedUrl;
      if (updates.courseId !== undefined) updateData.courseId = updates.courseId;

      // ✅ Safely handle duration (always an object)
      const existingDuration = lessonData.duration || { hours: 0, minutes: 0 };
      const newDuration: Partial<Duration> = updates.duration || {};


      updateData.duration = {
        hours: newDuration.hours ?? existingDuration.hours ?? 0,
        minutes: newDuration.minutes ?? existingDuration.minutes ?? 0,
      };



      await updateDoc(lessonRef, updateData);

      return ok(null);
    } catch (error) {
      console.error("❌ LessonService - Error updating lesson:", error);
      return fail("Failed to update lesson");
    }
  }


  // ───────────────────────────────────────────────
  async getLessonById(lessonId: string): Promise<Lesson | null> {
    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/getLessons?id=${lessonId}&type=lesson`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
      });
      if (response.status !== 200) return null;

      const result = await response.json();
      const data = result?.data;
      return {
        ...data,
        createdAt: data?.createdAt?.toDate?.() ?? data?.createdAt ?? null,
        updatedAt: data?.updatedAt?.toDate?.() ?? data?.updatedAt ?? null,
      } as Lesson;
    } catch (err) {
      console.error("❌ LessonService.getLessonById:", err);
      return null;
    }
  }

  // ───────────────────────────────────────────────
  async getAllLessons(): Promise<Lesson[]> {
    try {
      const qs = await getDocs(collection(db, COLLECTION.LESSONS));
      return qs.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? null,
        } as Lesson;
      });
    } catch (err) {
      console.error("❌ LessonService.getAllLessons:", err);
      return [];
    }
  }

  // ───────────────────────────────────────────────
  async getLessonsByIds(lessonIds: string[]): Promise<Lesson[]> {
    if (!lessonIds.length) return [];
    try {
      const results: Lesson[][] = [];
      const chunk = 10;
      for (let i = 0; i < lessonIds.length; i += chunk) {
        const seg = lessonIds.slice(i, i + chunk);
        const q = query(
          collection(db, COLLECTION.LESSONS),
          where("id", "in", seg)
        );
        const snap = await getDocs(q);
        results.push(
          snap.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
              createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? null,
              updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? null,
            } as Lesson;
          })
        );
      }
      return results.flat();
    } catch (err) {
      console.error("❌ LessonService.getLessonsByIds:", err);
      return [];
    }
  }

  // ───────────────────────────────────────────────
  async deleteLesson(lessonId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION.LESSONS, lessonId));
      console.log("🗑️ Deleted lesson:", lessonId);
    } catch (err) {
      console.error("❌ LessonService.deleteLesson:", err);
      throw new Error("Failed to delete lesson");
    }
  }

  // ───────────────────────────────────────────────
  async getLessons(
    filters?: { field: keyof Lesson; op: WhereFilterOp; value: any }[],
    options: PaginationOptions<Lesson> = {}
  ): Promise<Result<PaginatedResult<Lesson>>> {
    try {
      const {
        limit: perPage = 25,
        orderBy: orderSet = { field: "createdAt", direction: "desc" },
        pageDirection = "next",
        cursor = null,
      } = options;

      let q: Query = collection(db, COLLECTION.LESSONS);

      if (filters?.length) {
        q = query(
          q,
          ...filters.map((f) => where(f.field as string, f.op, f.value))
        );
      }

      const { field, direction } = orderSet;

      if (pageDirection === "previous" && cursor) {
        q = query(q, orderBy(field as string, direction), endBefore(cursor), limitToLast(perPage));
      } else if (cursor) {
        q = query(q, orderBy(field as string, direction), startAfter(cursor), limit(perPage));
      } else {
        q = query(q, orderBy(field as string, direction), limit(perPage));
      }

      const res = await getDocs(q);
      const docs = res.docs;
      if (pageDirection === "previous") docs.reverse();

      const lessons = docs.map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          courseId: data.courseId,
          title: data.title,
          type: data.type,
          description: data.description,
          embedUrl: data.embedUrl,
          duration: data.duration,
          createdAt: data.createdAt?.toDate?.() ?? data.createdAt ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? data.updatedAt ?? null,
        } as Lesson;
      });

      const hasNext = docs.length === perPage;
      const hasPrev = !!cursor;
      return ok({
        data: lessons,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        nextCursor: hasNext ? docs[docs.length - 1] : null,
        previousCursor: hasPrev ? docs[0] : null,
      });
    } catch (err) {
      console.error("❌ LessonService.getLessons:", err);
      return fail("Error fetching lessons");
    }


  }

  /**
    * Fetches all lesson descriptions and calculates the total duration for a given course.
    *
    * @param courseId - The unique identifier of the course whose lesson details should be retrieved.
    * @returns {Promise<Result<{ descriptions: Record<string, string>; totalDuration: Duration }>>} 
    * A promise resolving to an object containing:
    *  - `descriptions`: a map of lessonId → description
    *  - `totalDuration`: the total combined duration of all lessons ({ hours, minutes })
    *
    * @example
    * const result = await lessonService.getLessonDetailsByCourseId('course_123');
    * if (result.ok) {
    *   console.log(result.value.descriptions); // { lessonId1: "Intro to AI", lessonId2: "Neural Networks" }
    *   console.log(result.value.totalDuration); // { hours: 3, minutes: 45 }
    * }
    */
  async getLessonDetailsByCourseId(
    courseId: string
  ): Promise<Result<{ descriptions: Record<string, string>; totalDuration: Duration }>> {
    try {
      const lessonsRef = collection(db, COLLECTION.LESSONS);
      const q = query(lessonsRef, where("courseId", "==", courseId));
      const querySnapshot = await getDocs(q);

      const descriptions: Record<string, string> = {};
      let totalMinutes = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const lessonId = doc.id;

        if (typeof data.description === "string" && data.description.trim().length > 0) {
          descriptions[lessonId] = data.description;
        }

        if (data.duration && typeof data.duration.hours === "number" && typeof data.duration.minutes === "number") {
          totalMinutes += data.duration.hours * 60 + data.duration.minutes;
        }
      });

      // ✅ Convert totalMinutes → hours + minutes
      const totalDuration: Duration = {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
      };
      return ok({ descriptions, totalDuration });
    } catch (error) {
      logError("LessonService.getLessonDescriptionsByCourseId", error);
      return fail("Error fetching lesson descriptions and duration by courseId");
    }
  }
}

export const lessonService = new LessonService();
