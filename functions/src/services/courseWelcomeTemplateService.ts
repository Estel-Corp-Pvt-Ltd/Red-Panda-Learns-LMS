import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { COLLECTION } from "../constants";
import { CourseEnrollAnnouncement } from "../types/announcements";
import { Result, ok, fail } from "../utils/response";

const db = admin.firestore();

class CourseWelcomeTemplateService {
  /**
   * Get welcome template configuration for a course
   */
  async getWelcomeTemplate(
    courseId: string
  ): Promise<Result<CourseEnrollAnnouncement | null>> {
    try {
      const docRef = db
        .collection(COLLECTION.COURSE_WELCOME_TEMPLATES)
        .doc(courseId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return ok(null);
      }

      return ok({
        id: docSnap.id,
        ...docSnap.data(),
      } as CourseEnrollAnnouncement);
    } catch (error) {
      functions.logger.error("❌ Error fetching welcome template:", error);
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
      const docRef = db
        .collection(COLLECTION.COURSE_WELCOME_TEMPLATES)
        .doc(courseId);
      const docSnap = await docRef.get();

      const templateData: Omit<CourseEnrollAnnouncement, "id"> = {
        courseId,
        subject: subject.trim(),
        body: body.trim(),
        createdAt: docSnap.exists
          ? docSnap.data()!.createdAt
          : admin.firestore.FieldValue.serverTimestamp(),
      };

      if (docSnap.exists) {
        await docRef.update(templateData);
      } else {
        await docRef.set(templateData);
      }

      functions.logger.info(
        `✅ Saved welcome template for course ${courseId}`
      );

      return ok({
        id: courseId,
        ...templateData,
      } as CourseEnrollAnnouncement);
    } catch (error) {
      functions.logger.error("❌ Error saving welcome template:", error);
      return fail("Failed to save welcome template");
    }
  }

  /**
   * Delete welcome template for a course
   */
  async deleteWelcomeTemplate(courseId: string): Promise<Result<null>> {
    try {
      const docRef = db
        .collection(COLLECTION.COURSE_WELCOME_TEMPLATES)
        .doc(courseId);
      await docRef.delete();

      functions.logger.info(
        `✅ Deleted welcome template for course ${courseId}`
      );

      return ok(null);
    } catch (error) {
      functions.logger.error("❌ Error deleting welcome template:", error);
      return fail("Failed to delete welcome template");
    }
  }

  /**
   * Check if a course has welcome template configured
   */
  async hasWelcomeTemplate(courseId: string): Promise<boolean> {
    try {
      const docRef = db
        .collection(COLLECTION.COURSE_WELCOME_TEMPLATES)
        .doc(courseId);
      const docSnap = await docRef.get();

      return docSnap.exists;
    } catch (error) {
      functions.logger.error(
        "❌ Error checking welcome template:",
        error
      );
      return false;
    }
  }
}

export const courseWelcomeTemplateService =
  new CourseWelcomeTemplateService();
