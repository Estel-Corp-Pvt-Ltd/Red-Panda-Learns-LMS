import { COLLECTION, EMAIL_TYPE } from "../../constants";
import { sendAnnouncementEmails } from "../../services/email/sendAnnouncementsMails";
import { sendInBatches } from "../../services/email/sendMailInBatches";
import { buildCourseAnnouncementEmail } from "../../services/email/templates/courseAnnouncement";
import { enrollmentService } from "../../services/enrollService";
import { Announcement } from "../../types/announcements";
import { EmailType } from "../../types/general";
import * as admin from "firebase-admin";
import { buildGlobalNotificationEmail } from '../../services/email/templates/globalAnnouncements';
import { userService } from '../../services/userService';
import { buildCourseManualAnnouncementEmail } from "../../services/email/templates/courseManual";
// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const announcementRef = db.collection(COLLECTION.ANNOUNCEMENTS);

export async function sendAnnouncementEmailonDocCreation(
  id: string
): Promise<{ success: boolean; error?: string; recipientCount?: number }> {
  try {
    const parts = id.split("_");
    const prefix = parts[0];

    const doc = await announcementRef.doc(id).get();

    if (!doc.exists) {
      return { success: false, error: "Announcement not found" };
    }

    const announcement = doc.data() as Announcement;

    let html = "";
    let subject = "";
    let recipients: string[] = [];
    let emailType: EmailType;

    switch (prefix) {
      /**
       * Course Announcement: C_${courseId}_${assignmentId}
       */
      case "C": {
        const courseId = `${parts[1]}_${parts[2]}`; // "course_123"
        const assignmentId = `${parts[3]}_${parts[4]}`; // "assignment_123"
        const courseSnap = await db
          .collection(COLLECTION.COURSES)
          .doc(courseId)
          .get();

        if (!courseSnap.exists) {
          return { success: false, error: "Course not found" };
        }

        const course = courseSnap.data() as { slug?: string; title?: string };

        // Fallback: use course.slug if present, else courseId
        const urlSlug =
          course.slug && course.slug.trim() !== "" ? course.slug : courseId;

        html = buildCourseAnnouncementEmail(
          announcement.title,
          announcement.body,
          urlSlug,
          assignmentId
        );

        subject = `${announcement.title}`;
        recipients = await enrollmentService.getCourseEnrolledEmails(courseId);
        emailType = EMAIL_TYPE.COURSE_ANNOUNCEMENT;
        break;
      }

      /**
       * Broadcast to everyone: G_All_Random
       */
      case "G": {
        html = buildGlobalNotificationEmail(
          announcement.title,
          announcement.body
        );
        subject = `Announcement: ${announcement.title}`;
        recipients = await userService.getAllUserEmails();
        emailType = EMAIL_TYPE.GENERAL_ALL;
        break;
      }


      case "CM": {
        const courseId = `${parts[1]}_${parts[2]}`; // "course_123"
        const courseSnap = await db
          .collection(COLLECTION.COURSES)
          .doc(courseId)
          .get();

        if (!courseSnap.exists) {
          return { success: false, error: "Course not found" };
        }

        const course = courseSnap.data() as { slug?: string; title?: string };

        // Fallback: use course.slug if present, else courseId
        const urlSlug =
          course.slug && course.slug.trim() !== "" ? course.slug : courseId;

        html = buildCourseManualAnnouncementEmail(
          announcement.title,
          announcement.body,
          urlSlug,
          
        );

        subject = `${announcement.title}`;
        recipients = await enrollmentService.getCourseEnrolledEmails(courseId);
        emailType = EMAIL_TYPE.COURSE_ANNOUNCEMENT;
        break;
      }


      /**
       * Role-Based: RB_INS_*, RB_STU_*, RB_Acc_*, RB_Tch_*
       */
      // case "RB": {
      //   const subType = parts[1];

      //   switch (subType) {
      //     case "INS": {
      //       html = buildRoleBasedEmail(
      //         announcement.title,
      //         announcement.body,
      //         "Instructors"
      //       );
      //       subject = `Instructor Announcement: ${announcement.title}`;
      //       recipients = await getInstructorEmails();
      //       emailType = EMAIL_TYPE.RB_INSTRUCTOR;
      //       break;
      //     }

      //     case "STU": {
      //       html = buildRoleBasedEmail(
      //         announcement.title,
      //         announcement.body,
      //         "Students"
      //       );
      //       subject = `Student Announcement: ${announcement.title}`;
      //       recipients = await getStudentEmails();
      //       emailType = EMAIL_TYPE.RB_STUDENT;
      //       break;
      //     }

      //     case "Acc": {
      //       html = buildRoleBasedEmail(
      //         announcement.title,
      //         announcement.body,
      //         "Accountants"
      //       );
      //       subject = `Accountant Announcement: ${announcement.title}`;
      //       recipients = await getAccountantEmails();
      //       emailType = EMAIL_TYPE.RB_ACCOUNTANT;
      //       break;
      //     }

      //     case "Tch": {
      //       html = buildRoleBasedEmail(
      //         announcement.title,
      //         announcement.body,
      //         "Teachers"
      //       );
      //       subject = `Teacher Announcement: ${announcement.title}`;
      //       recipients = await getTeacherEmails();
      //       emailType = EMAIL_TYPE.RB_TEACHER;
      //       break;
      //     }

      //     default:
      //       return { success: false, error: `Unknown RB sub-type: ${subType}` };
      //   }

      //   break;
      // }

      default:
        return {
          success: false,
          error: `Unknown announcement type: ${prefix}`,
        };
    }

    /**
     * Validate recipients
     */
    if (!recipients || recipients.length === 0) {
      return { success: false, error: "No recipients found" };
    }

    /**
     * Send in batches (50 default)
     */
    await sendInBatches(recipients, 50, async (batch) => {
      return sendAnnouncementEmails({
        to: "", // unused
        bcc: batch,
        subject,
        html,
        type: emailType,
      });
    });

    return { success: true, recipientCount: recipients.length };
  } catch (error) {
    console.error(`Error sending email for announcement ${id}:`, error);
    return { success: false, error: (error as Error).message };
  }
}
