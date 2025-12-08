
import { ok, fail, Result } from "../utils/response";
import { FieldValue } from "firebase-admin/firestore";
import { AnnouncementStatus } from "../types/general";
import {
  ANNOUNCEMENT_SCOPE,
  ANNOUNCEMENT_STATUS,
  COLLECTION,
  
} from "../constants";
import * as admin from "firebase-admin";
import { Announcement } from "../types/announcements";

// import { sendMail } from './email/sendMail'; // <-- Ensure this exists

// Import or define your email template builders
// import {
//   buildCourseAnnouncementEmail,
//   buildGeneralNotificationEmail,
//   buildInstructorEmail,
//   buildStudentEmail,
//   buildAccountantEmail,
//   buildTeacherEmail
// } from '../utils/emailTemplates';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();


const announcementService = {
  /**
   * Create a course assignment announcement.
   * @param {Object} params - Parameters for creating the announcement.
   * @param {string} params.courseId - The course ID.
   * @param {string} params.assignmentId - The assignment ID.
   * @param {string} params.title - The title of the announcement.
   * @param {string} params.body - The body of the announcement.
   * @param {string | null} params.createdBy - The admin UID creating the announcement.
   * @param {AnnouncementStatus} [params.status=ANNOUNCEMENT_STATUS.PUBLISHED] - The status of the announcement.
   * @returns {Promise<Result<string>>} - The result of the announcement creation.
   */
  async createCourseAssignmentAnnouncement(params: {
    courseId: string;
    assignmentId: string;
    title: string;
    body: string;
    createdBy: string | null; // admin uid
    status?: AnnouncementStatus; // optional
  }): Promise<Result<string>> {
    try {
      const {
        courseId,
        assignmentId,
        title,
        body,
        createdBy,
        status = ANNOUNCEMENT_STATUS.PUBLISHED,
      } = params;

      if (!courseId) {
        return fail("courseId is required");
      }

      if (!assignmentId) {
        return fail("assignmentId is required");
      }

      // Generate deterministic ID
      const announcementId = `C_${courseId}_${assignmentId}`;

      const docRef = db
        .collection(COLLECTION.ANNOUNCEMENTS)
        .doc(announcementId);

      // Check if document already exists — idempotent
      const existing = await docRef.get();
      if (existing.exists) {
        return ok(announcementId);
      }

      const announcement: Announcement = {
        id: announcementId,
        scope: ANNOUNCEMENT_SCOPE.COURSE,
        courseId,
        title,
        body,
        status,
        createdBy,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(announcement);

      return ok(announcementId);
    } catch (error: any) {
      console.error("Error creating course assignment announcement", error);
      return fail("Failed to create course assignment announcement");
    }
  },

  /**
   * Example of another function you could add related to announcements.
   * @param {string} announcementId - The ID of the announcement to fetch.
   * @returns {Promise<Result<Announcement>>} - The result of the fetch operation.
   */
  async getAnnouncementById(
    announcementId: string
  ): Promise<Result<Announcement>> {
    try {
      const docRef = db
        .collection(COLLECTION.ANNOUNCEMENTS)
        .doc(announcementId);
      const doc = await docRef.get();
      if (!doc.exists) {
        return fail("Announcement not found");
      }
      return ok(doc.data() as Announcement);
    } catch (error: any) {
      console.error("Error fetching announcement", error);
      return fail("Failed to fetch announcement");
    }
  },

  /**
   * Example of another function to list announcements by course.
   * @param {string} courseId - The ID of the course.
   * @returns {Promise<Result<Announcement[]>>} - The result of the fetch operation.
   */
  async listAnnouncementsByCourse(
    courseId: string
  ): Promise<Result<Announcement[]>> {
    try {
      const snapshot = await db
        .collection(COLLECTION.ANNOUNCEMENTS)
        .where("courseId", "==", courseId)
        .get();

      const announcements: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcements.push(doc.data() as Announcement);
      });

      return ok(announcements);
    } catch (error: any) {
      console.error("Error listing announcements by course", error);
      return fail("Failed to list announcements");
    }
  },

 
};

export default announcementService;
