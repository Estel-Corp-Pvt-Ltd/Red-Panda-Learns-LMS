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

class CourseEnrollAnnouncementService {
  /**
   * Get enrollment announcement configuration for a course
   */
  async getEnrollAnnouncement(courseId: string): Promise<Result<CourseEnrollAnnouncement | null>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_ENROLL_ANNOUNCEMENTS, courseId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return ok(null);
      }

      return ok({
        id: docSnap.id,
        ...docSnap.data(),
      } as CourseEnrollAnnouncement);
    } catch (error) {
      logError("CourseEnrollAnnouncementService.getEnrollAnnouncement", error);
      return fail("Failed to fetch enrollment announcement");
    }
  }

  /**
   * Create or update enrollment announcement for a course
   */
  async saveEnrollAnnouncement(
    courseId: string,
    subject: string,
    body: string
  ): Promise<Result<CourseEnrollAnnouncement>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_ENROLL_ANNOUNCEMENTS, courseId);
      const docSnap = await getDoc(docRef);

      const announcementData: Omit<CourseEnrollAnnouncement, "id"> = {
        courseId,
        subject: subject.trim(),
        body: body.trim(),
        createdAt: docSnap.exists() ? docSnap.data().createdAt : Timestamp.now(),
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, announcementData as any);
      } else {
        await setDoc(docRef, announcementData);
      }

      return ok({
        id: courseId,
        ...announcementData,
      } as CourseEnrollAnnouncement);
    } catch (error) {
      logError("CourseEnrollAnnouncementService.saveEnrollAnnouncement", error);
      return fail("Failed to save enrollment announcement");
    }
  }

  /**
   * Delete enrollment announcement for a course
   */
  async deleteEnrollAnnouncement(courseId: string): Promise<Result<null>> {
    try {
      const docRef = doc(db, COLLECTION.COURSE_ENROLL_ANNOUNCEMENTS, courseId);
      await deleteDoc(docRef);
      return ok(null);
    } catch (error) {
      logError("CourseEnrollAnnouncementService.deleteEnrollAnnouncement", error);
      return fail("Failed to delete enrollment announcement");
    }
  }
}

export const courseEnrollAnnouncementService = new CourseEnrollAnnouncementService();
