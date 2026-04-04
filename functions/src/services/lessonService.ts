import * as admin from "firebase-admin";
import { Lesson, LessonAttachment } from "../types/lesson";
import { ok, fail, Result } from "../utils/response";
import { COLLECTION } from "../constants";
import { Duration } from "../types/general";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class LessonService {
  // ───────────────────────────────────────────────
  // Generate Lesson ID
  // ───────────────────────────────────────────────
  private async generateLessonId(): Promise<string> {
    const counterRef = db.collection(COLLECTION.COUNTERS).doc("lessonCounter");

    try {
      return await db.runTransaction(async (tx) => {
        const counterDoc = await tx.get(counterRef);
        const gap = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
        const lastNumber = counterDoc.exists ? counterDoc.data()!.lastNumber : 30000000;

        const nextNumber = lastNumber + gap;
        tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        return `lesson_${nextNumber}`;
      });
    } catch (error) {
      throw new Error("Failed to generate lesson ID");
    }
  }

  // ───────────────────────────────────────────────
  // Create Lesson
  // ───────────────────────────────────────────────
  async createLesson(
    data: Omit<Lesson, "id" | "createdAt" | "updatedAt">
  ): Promise<Result<Lesson>> {
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
        karmaBoostExpiresAfter: {
          hours: data.karmaBoostExpiresAfter?.hours ?? 0,
          minutes: data.karmaBoostExpiresAfter?.minutes ?? 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection(COLLECTION.LESSONS).doc(lessonId).set(lesson);

      return ok(lesson);
    } catch (error) {
      return fail("Failed to create lesson");
    }
  }

  // ───────────────────────────────────────────────
  // Update Lesson
  // ───────────────────────────────────────────────
  async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<Result<void>> {
    try {
      const lessonRef = db.collection(COLLECTION.LESSONS).doc(lessonId);
      const lessonDoc = await lessonRef.get();

      if (!lessonDoc.exists) {
        return fail("Lesson not found");
      }

      const lessonData = lessonDoc.data() as Lesson;

      // Base update object
      const updateData: Partial<Lesson> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

      const existingkarmaBoostExpiresAfter = lessonData.karmaBoostExpiresAfter || {
        hours: 0,
        minutes: 0,
      };
      const newkarmaBoostExpiresAfter: Partial<Duration> = updates.karmaBoostExpiresAfter || {};

      updateData.karmaBoostExpiresAfter = {
        hours: newkarmaBoostExpiresAfter.hours ?? existingkarmaBoostExpiresAfter.hours ?? 0,
        minutes: newkarmaBoostExpiresAfter.minutes ?? existingkarmaBoostExpiresAfter.minutes ?? 0,
      };
      await lessonRef.update(updateData);

      return ok(undefined);
    } catch (error) {
      return fail("Failed to update lesson");
    }
  }

  // ───────────────────────────────────────────────
  // Get Lesson by ID
  // ───────────────────────────────────────────────
  async getLessonById(lessonId: string): Promise<Result<Lesson>> {
    try {
      const lessonDoc = await db.collection(COLLECTION.LESSONS).doc(lessonId).get();

      if (!lessonDoc.exists) {
        return fail("Lesson not found");
      }

      const data = lessonDoc.data()!;
      const lesson: Lesson = {
        id: lessonDoc.id,
        courseId: data.courseId,
        title: data.title,
        type: data.type,
        description: data.description || "",
        embedUrl: data.embedUrl || "",
        duration: data.duration || { hours: 0, minutes: 0 },
        karmaBoostExpiresAfter: data.karmaBoostExpiresAfter || { hours: 0, minutes: 0 },
        createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
      };

      return ok(lesson);
    } catch (error) {
      return fail("Failed to fetch lesson");
    }
  }

  // ───────────────────────────────────────────────
  // Get All Lessons
  // ───────────────────────────────────────────────
  async getAllLessons(): Promise<Result<Lesson[]>> {
    try {
      const snapshot = await db.collection(COLLECTION.LESSONS).get();
      const lessons: Lesson[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        lessons.push({
          id: doc.id,
          courseId: data.courseId,
          title: data.title,
          type: data.type,
          description: data.description || "",
          embedUrl: data.embedUrl || "",
          duration: data.duration || { hours: 0, minutes: 0 },
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
        } as Lesson);
      });

      return ok(lessons);
    } catch (error) {
      return fail("Failed to fetch lessons");
    }
  }

  // ───────────────────────────────────────────────
  // Get Lessons by IDs
  // ───────────────────────────────────────────────
  async getLessonsByIds(lessonIds: string[]): Promise<Result<Lesson[]>> {
    if (!lessonIds.length) return ok([]);

    try {
      const results: Lesson[] = [];
      const chunkSize = 10; // Firestore 'in' query limit

      for (let i = 0; i < lessonIds.length; i += chunkSize) {
        const chunk = lessonIds.slice(i, i + chunkSize);
        const snapshot = await db
          .collection(COLLECTION.LESSONS)
          .where(admin.firestore.FieldPath.documentId(), "in", chunk)
          .get();

        snapshot.forEach((doc) => {
          const data = doc.data();
          results.push({
            id: doc.id,
            courseId: data.courseId,
            title: data.title,
            type: data.type,
            description: data.description || "",
            embedUrl: data.embedUrl || "",
            duration: data.duration || { hours: 0, minutes: 0 },
            createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
          } as Lesson);
        });
      }

      return ok(results);
    } catch (error) {
      return fail("Failed to fetch lessons by IDs");
    }
  }

  // ───────────────────────────────────────────────
  // Delete Lesson
  // ───────────────────────────────────────────────
  async deleteLesson(lessonId: string): Promise<Result<void>> {
    try {
      await db.collection(COLLECTION.LESSONS).doc(lessonId).delete();
      return ok(undefined);
    } catch (error) {
      return fail("Failed to delete lesson");
    }
  }

  // ───────────────────────────────────────────────
  // Get Lesson Details by Course ID
  // ───────────────────────────────────────────────
  async getLessonDetailsByCourseId(
    courseId: string
  ): Promise<Result<{ descriptions: Record<string, string>; totalDuration: Duration }>> {
    try {
      const snapshot = await db
        .collection(COLLECTION.LESSONS)
        .where("courseId", "==", courseId)
        .get();

      const descriptions: Record<string, string> = {};
      let totalMinutes = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const lessonId = doc.id;

        if (typeof data.description === "string" && data.description.trim().length > 0) {
          descriptions[lessonId] = data.description;
        }

        if (
          data.duration &&
          typeof data.duration.hours === "number" &&
          typeof data.duration.minutes === "number"
        ) {
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
      return fail("Error fetching lesson descriptions and duration by courseId");
    }
  }

  // ───────────────────────────────────────────────
  // Get Lessons by Course ID
  // ───────────────────────────────────────────────
  async getLessonsByCourseId(courseId: string): Promise<Result<Lesson[]>> {
    try {
      const snapshot = await db
        .collection(COLLECTION.LESSONS)
        .where("courseId", "==", courseId)
        .orderBy("createdAt", "asc")
        .get();

      const lessons: Lesson[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        lessons.push({
          id: doc.id,
          courseId: data.courseId,
          title: data.title,
          type: data.type,
          description: data.description || "",
          embedUrl: data.embedUrl || "",
          duration: data.duration || { hours: 0, minutes: 0 },
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
        } as Lesson);
      });

      return ok(lessons);
    } catch (error) {
      return fail("Failed to fetch lessons by course ID");
    }
  }

  // Lesson Attachments methods
  async getLessonAttachments(lessonId: string): Promise<Result<LessonAttachment[]>> {
    try {
      const snapshot = await db
        .collection(COLLECTION.LESSON_ATTACHMENTS)
        .where("lessonId", "==", lessonId)
        .get();

      const attachments: LessonAttachment[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        attachments.push({
          id: doc.id,
          name: data.name,
          url: data.url,
          type: data.type,
          size: data.size,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null,
        } as LessonAttachment);
      });

      return ok(attachments);
    } catch (error) {
      return fail("Failed to fetch lesson attachments");
    }
  }
}

export const lessonService = new LessonService();
