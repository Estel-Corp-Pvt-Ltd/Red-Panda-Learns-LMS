import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "@/firebaseConfig";
import { logError } from "@/utils/logger";
import { fail, ok, Result } from "@/utils/response";

import { COLLECTION, USER_ROLE } from "@/constants";
import { Enrollment } from "@/types/enrollment";
import { LearningProgress } from "@/types/learning-progress";
import { formatDate } from "@/utils/date-time";

class LearningProgressService {
  /**
   * Creates a new LearningProgress document for a course.
   *
   * @param courseId - The ID of the course the student is enrolled in.
   * @param totalLessons - The total number of lessons in the course.
   * @returns A Result object containing the created progress ID on success, or an error on failure.
   */
  async createLessonProgress(
    userId: string,
    courseId: string,
  ): Promise<Result<{ progressId: string }>> {
    try {
      const progressRef = doc(collection(db, COLLECTION.LEARNING_PROGRESS));
      const progressId = progressRef.id;

      const newProgress: LearningProgress = {
        id: progressId,
        userId,
        courseId,
        currentLessonId: null,
        lastAccessed: serverTimestamp(),
        lessonHistory: [],
        completionDate: null,
        updatedAt: serverTimestamp(),
      };

      await setDoc(progressRef, newProgress);

      return ok({ progressId });
    } catch (error: any) {
      logError("LearningProgressService.createLessonProgress", error);
      return fail("Failed to create lesson progress.", error.code || error.message);
    }
  }

  /**
  * Updates the LearningProgress document when a lesson is completed.
  *
  * @param progressId - The ID of the LearningProgress document.
  * @param completedLessonId - The ID of the lesson that was just completed.
  */
  async completeLesson(
    userId: string,
    courseId: string,
    completedLessonId: string
  ): Promise<Result<null>> {
    try {
      // 1️⃣ Query progress document for this user + course
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      let progressRef;
      let progress: LearningProgress | null = null;

      if (snapshot.empty) {
        console.log("No existing progress found — creating new one...");
        // Create a brand new progress document
        const createResult = await this.createLessonProgress(userId, courseId);
        if (!createResult.success) {
          return fail(
            "Failed to create new progress document.",

          );
        }

        // Retrieve the new doc reference
        progressRef = doc(db, COLLECTION.LEARNING_PROGRESS, createResult.data.progressId);
        progress = {
          id: createResult.data.progressId,
          userId,
          courseId,
          currentLessonId: null,
          lessonHistory: [],
          completionDate: null,
          lastAccessed: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      } else {
        // There should be exactly one document
        const progressDoc = snapshot.docs[0];
        progressRef = progressDoc.ref;
        progress = progressDoc.data() as LearningProgress;
      }

      // 2️⃣ Update lesson history safely (avoid duplicates)
      const updatedLessonHistory = [
        ...(progress.lessonHistory || []),
        completedLessonId,
      ].filter((v, i, a) => a.indexOf(v) === i);

      // 3️⃣ Write update to Firestore
      await updateDoc(progressRef, {
        currentLessonId: completedLessonId,
        lessonHistory: updatedLessonHistory,
        lastAccessed: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error: any) {
      logError("LearningProgressService.completeLesson", error);
      return fail("Failed to update progress.", error.code || error.message);
    }
  }

  async getUserCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<Result<LearningProgress[]>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);

    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }


  }

  async getUserProgress(
    userId: string
  ): Promise<Result<LearningProgress[]>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok([]); // no progress found, return empty array
      }

      const progressList: LearningProgress[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as LearningProgress),
      }));

      return ok(progressList);

    } catch (error: any) {
      logError("LearningProgressService.getUserProgress", error);
      return fail("Failed to fetch user progress.", error.code || error.message);
    }
  }

  async completeCourse(
    userId: string,
    courseId: string,
    totalLessons: number
  ): Promise<Result<boolean>> {
    try {
      if (totalLessons <= 0) {
        return ok(false);
      }

      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok(false);
      }

      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data() as LearningProgress;

      const completedLessons = progressData.lessonHistory?.length || 0;
      const completionPercentage =
        (completedLessons / totalLessons) * 100;

      if (
        completionPercentage >= 90 &&
        !progressData.completionDate
      ) {
        await updateDoc(
          doc(db, COLLECTION.LEARNING_PROGRESS, progressDoc.id),
          {
            completionDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        return ok(true);
      }

      return ok(false);

    } catch (error: any) {
      logError("LearningProgressService.completeCourse", error);
      return fail(
        "Failed to complete course",
        error.code || error.message
      );
    }
  }

  async issueCertificate(
    userId: string,
    courseId: string,
    issuerUid: string
  ): Promise<Result<boolean>> {
    try {
      const issuerRef = doc(db, COLLECTION.USERS, issuerUid);
      const issuerSnap = await getDoc(issuerRef);

      if (!issuerSnap.exists()) {
        return fail("Issuer not found");
      }

      const issuerData = issuerSnap.data();

      if (issuerData.role !== USER_ROLE.ADMIN) {
        return fail("Only ADMIN can issue certificates");
      }

      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return fail("Learning progress not found");
      }

      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data() as LearningProgress;

      if (!progressData.completionDate) {
        return fail("Course not completed yet");
      }

      if (progressData.certification?.issued) {
        return ok(false);
      }

      await updateDoc(
        doc(db, COLLECTION.LEARNING_PROGRESS, progressDoc.id),
        {
          certification: {
            issued: true,
            issuedAt: serverTimestamp(),
            // later do on server
            certificateId: crypto.randomUUID(),
          },
          updatedAt: serverTimestamp(),
        }
      );

      return ok(true);

    } catch (error: any) {
      logError("LearningProgressService.issueCertificate", error);
      return fail(
        "Failed to issue certificate",
        error.code || error.message
      );
    }
  }

  async getFormattedCompletionDateAndCertificateId(
    userId: string,
    courseId: string
  ): Promise<Result<{ completionDate: string | null; certificateId: string | null; }>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return ok(null);
      }

      const progressData = snapshot.docs[0].data() as LearningProgress;

      const formattedDate = formatDate(progressData.completionDate);

      return ok({
        completionDate: formattedDate === "—" ? null : formattedDate,
        certificateId: progressData.certification.certificateId
      });

    } catch (error: any) {
      logError(
        "LearningProgressService.getFormattedCompletionDate",
        error
      );
      return fail(
        "Failed to fetch completion date.",
        error.code || error.message
      );
    }
  }

  /**
 * Sets or updates the certification remark for a user's course progress.
 *
 * @param userId - ID of the student
 * @param courseId - ID of the course
 * @param remark - Optional remark text
 */
  async setCertificationRemark(
    userId: string,
    courseId: string,
    remark: string | null
  ): Promise<Result<boolean>> {
    try {
      const progressQuery = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("userId", "==", userId),
        where("courseId", "==", courseId)
      );

      const snapshot = await getDocs(progressQuery);

      if (snapshot.empty) {
        return fail("Learning progress not found");
      }

      const progressDoc = snapshot.docs[0];
      const progressRef = progressDoc.ref;

      await updateDoc(progressRef, {
        certification: {
          ...(progressDoc.data().certification || {}),
          remark: remark || null,
        },
        updatedAt: serverTimestamp(),
      });

      return ok(true);

    } catch (error: any) {
      logError("LearningProgressService.setCertificationRemark", error);
      return fail(
        "Failed to update certification remark",
        error.code || error.message
      );
    }
  }

  async getCertificateByCertificateId(certificateId: string) {
    try {
      const q = query(
        collection(db, COLLECTION.LEARNING_PROGRESS),
        where("certification.certificateId", "==", certificateId),
        where("certification.issued", "==", true)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return fail("Certificate not found");
      }

      const progressDoc = snapshot.docs[0];
      const progressData = progressDoc.data() as LearningProgress;

      const { userId, courseId, completionDate } = progressData;

      const enrollmentId = `${userId}_${courseId}`;

      const enrollmentRef = doc(
        db,
        COLLECTION.ENROLLMENTS,
        enrollmentId
      );
      const enrollmentSnap = await getDoc(enrollmentRef);

      if (!enrollmentSnap.exists()) {
        return fail("Enrollment not found");
      }

      const enrollment: Enrollment = {
        id: enrollmentSnap.id,
        ...(enrollmentSnap.data() as Enrollment),
      };

      const formattedCompletionDate = formatDate(completionDate);

      return ok({
        userName: enrollment.userName,
        courseName: enrollment.courseName,
        completionDate: formattedCompletionDate === "—" ? null : formattedCompletionDate,
      });
    } catch (error: any) {
      logError(
        "LearningProgressService.getCertificateByCertificateId",
        error
      );
      return fail(
        "Failed to fetch certificate",
        error.code || error.message
      );
    }
  }
}

export const learningProgressService = new LearningProgressService();

