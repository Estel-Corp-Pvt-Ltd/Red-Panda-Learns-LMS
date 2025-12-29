import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { CourseEnrollAnnouncement } from "@/types/announcements";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";

class CourseWelcomeTemplateService {
  /**
   * Get welcome template configuration for a course
   */
  async getWelcomeTemplate(courseId: string): Promise<Result<CourseEnrollAnnouncement | null>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_WELCOME_TEMPLATES, courseId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return ok(null);
      }

      return ok({
        id: docSnap.id,
        ...docSnap.data(),
      } as CourseEnrollAnnouncement);
    } catch (error) {
      logError("CourseWelcomeTemplateService.getWelcomeTemplate", error);
      return fail("Failed to fetch welcome template");
    }
  }

  /**
   * Create or update welcome template for a course
   */
  async saveWelcomeTemplate(
    courseId: string,
    subject: string,
    body: string
  ): Promise<Result<CourseEnrollAnnouncement>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_WELCOME_TEMPLATES, courseId);
      const docSnap = await getDoc(docRef);

      const templateData: Omit<CourseEnrollAnnouncement, "id"> = {
        courseId,
        subject: subject.trim(),
        body: body.trim(),
        createdAt: docSnap.exists() ? docSnap.data().createdAt : Timestamp.now(),
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, templateData as any);
      } else {
        await setDoc(docRef, templateData);
      }

      return ok({
        id: courseId,
        ...templateData,
      } as CourseEnrollAnnouncement);
    } catch (error) {
      logError("CourseWelcomeTemplateService.saveWelcomeTemplate", error);
      return fail("Failed to save welcome template");
    }
  }

  /**
   * Delete welcome template for a course
   */
  async deleteWelcomeTemplate(courseId: string): Promise<Result<null>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_WELCOME_TEMPLATES, courseId);
      await deleteDoc(docRef);
      return ok(null);
    } catch (error) {
      logError("CourseWelcomeTemplateService.deleteWelcomeTemplate", error);
      return fail("Failed to delete welcome template");
    }
  }
}

export const courseWelcomeTemplateService = new CourseWelcomeTemplateService();
