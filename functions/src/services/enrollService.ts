import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { bundleService } from "./bundleService";
import { learningProgressService } from "./learningProgressService";
import { Result, ok, fail } from "../utils/response";
import { COLLECTION, ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS } from "../constants";
import { Enrollment } from "../types/enrollment";
import { FieldValue } from "firebase-admin/firestore";
import { TransactionLineItem } from "../types/transaction";
import { courseService } from "./courseService";
import { User } from "../types/user";
import { logger } from "firebase-functions";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const SKIP_DOMAIN = "RedPanda Learns.ai";
const SKIP_TEST = "test";
const SKIP_EMAIL = "email";
class EnrollmentService {
  /**
   * Generates a unique enrollment ID in the format: <userId>_<courseId>
   */
  private generateEnrollmentId(userId: string, courseId: string): string {
    return `${userId}_${courseId}`;
  }

  async getEnrollmentById(enrollmentId: string): Promise<Result<Enrollment>> {
    try {
      const doc = await db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId).get();
      if (!doc.exists) {
        return fail("Enrollment not found");
      }
      return ok(doc.data() as Enrollment);
    } catch (error: any) {
      functions.logger.error("Error fetching enrollment by ID:", error);
      return fail("Failed to fetch enrollment", error.message);
    }
  }

  /**
   * Creates enrollment intent with PENDING status (before payment)
   */
  async enrollUser(
    user: User,
    items: TransactionLineItem[],
    orderId: string
  ): Promise<Result<string[]>> {
    if (!items || items.length === 0) return ok([]);

    const batch = db.batch();
    const enrollmentIds: string[] = [];
    const userName = [user.firstName, user.middleName, user.lastName]
      .filter((namePart) => namePart && namePart.trim() !== "")
      .join(" ");
    try {
      for (const item of items) {
        if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
          const enrollmentId = this.generateEnrollmentId(user.id, item.itemId);
          enrollmentIds.push(enrollmentId);

          // Create enrollment for single course
          const enrollment: Enrollment = {
            id: enrollmentId,
            userId: user.id,
            userName: userName,
            userEmail: user.email,
            courseId: item.itemId,
            courseName: item.name,
            bundleId: "", // Empty for course enrollments
            enrollmentDate: FieldValue.serverTimestamp(),
            status: ENROLLMENT_STATUS.ACTIVE,
            orderId: orderId,
            completionDate: null,
            certification: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          batch.set(db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId), enrollment);

          // Create learning progress for the course
          await learningProgressService.createLessonProgress(user.id, item.itemId);
        } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
          // Bundle enrollment - create enrollments for each course in the bundle
          const bundleResult = await bundleService.getBundleById(item.itemId);
          if (!bundleResult.success || !bundleResult.data) {
            return fail("Bundle not found");
          }

          const bundleCourses = bundleResult.data.courses;

          // Create individual course enrollments for each course in the bundle
          for (const course of bundleCourses) {
            const courseEnrollmentId = this.generateEnrollmentId(user.id, course.id);
            enrollmentIds.push(courseEnrollmentId);

            const courseEnrollment: Enrollment = {
              id: courseEnrollmentId,
              userId: user.id,
              userName: userName,
              userEmail: user.email,
              courseId: course.id,
              courseName: course.title,
              bundleId: item.itemId, // Reference to parent bundle
              enrollmentDate: FieldValue.serverTimestamp(),
              status: ENROLLMENT_STATUS.ACTIVE,
              orderId: orderId,
              completionDate: null,
              certification: null,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            batch.set(
              db.collection(COLLECTION.ENROLLMENTS).doc(courseEnrollmentId),
              courseEnrollment
            );

            // Create learning progress for the bundle course
            await learningProgressService.createLessonProgress(user.id, course.id);
          }
        }
      }

      // Commit the batch
      await batch.commit();
      functions.logger.info(`Created enrollment intent for user ${user.id} with order ${orderId}`);

      return ok(enrollmentIds);
    } catch (error: any) {
      functions.logger.error("Error creating enrollment intent:", error);
      return fail("Enrollment intent creation failed", error.message);
    }
  }

  /**
   * Enroll user in free course (immediately active)
   */
  async enrollUserInFreeCourse(user: User, courseId: string): Promise<Result<string>> {
    if (!user) return fail("Invalid user");
    if (!courseId) return fail("Invalid course ID");

    try {
      const courseResult = await courseService.getCourseById(courseId);
      if (!courseResult.success || !courseResult.data) {
        return fail("Course not found");
      }
      const enrollmentId = this.generateEnrollmentId(user.id, courseId);
      const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (enrollmentSnap.exists) {
        return ok(enrollmentId);
      }
      const userName = [user.firstName, user.middleName, user.lastName]
        .filter((namePart) => namePart && namePart.trim() !== "")
        .join(" ");
      const enrollment: Enrollment = {
        id: enrollmentId,
        userId: user.id,
        userName: userName,
        userEmail: user.email,
        courseId: courseId,
        courseName: courseResult.data.title,
        bundleId: "", // Empty for free course
        enrollmentDate: FieldValue.serverTimestamp(),
        status: ENROLLMENT_STATUS.ACTIVE,
        orderId: "", // Empty for free courses
        completionDate: null,
        certification: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await enrollmentRef.set(enrollment);
      functions.logger.info(`Successfully enrolled user ${user.id} in free course ${courseId}`);

      // Create learning progress for the free course
      await learningProgressService.createLessonProgress(user.id, courseId);

      return ok(enrollmentId);
    } catch (error: any) {
      functions.logger.error("Error enrolling user in free course:", error);
      return fail("Enrollment in free course failed", error.message);
    }
  }

  isUserEnrolledInCourse = async (userId: string, courseId: string): Promise<Result<boolean>> => {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, courseId);
      const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (enrollmentSnap.exists) {
        const enrollmentData = enrollmentSnap.data() as Enrollment;
        if (enrollmentData.status === ENROLLMENT_STATUS.ACTIVE) {
          return ok(true);
        }
      }
      return ok(false);
    } catch (error: any) {
      functions.logger.error("Error checking enrollment status:", error);
      return fail("Failed to check enrollment status", error.message);
    }
  };

  // Helper to get enrolled students for a course
  // Efficiently fetch enrolled emails in chunks (batch reads)
  async getCourseEnrolledEmails(courseId: string): Promise<string[]> {
    const CHUNK_SIZE = 500;
    const emails: string[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    try {
      while (true) {
        let q = db
          .collection(COLLECTION.ENROLLMENTS)
          .where("courseId", "==", courseId)
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(CHUNK_SIZE);

        if (lastDoc) {
          q = q.startAfter(lastDoc);
        }

        const snapshot = await q.get();

        logger.info("Enrollment batch fetched", {
          courseId,
          size: snapshot.size,
        });

        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
          const data = doc.data();

          logger.debug("Enrollment doc fields", {
            docId: doc.id,
            keys: Object.keys(data),
            email: data.email,
            userEmail: data.userEmail,
            userId: data.userId,
          });

          const email: string | undefined = data.email ?? data.userEmail;

          if (!email) {
            logger.debug("Skipping enrollment: no email", { docId: doc.id });
            continue;
          }

          const lowerEmail = email.toLowerCase();

          if (lowerEmail.includes(SKIP_DOMAIN)) {
            logger.debug("Skipping enrollment email (domain)", email);
            continue;
          }

          if (lowerEmail.includes(SKIP_TEST)) {
            logger.debug("Skipping enrollment email (test)", email);
            continue;
          }

          if (lowerEmail.includes(SKIP_EMAIL)) {
            logger.debug("Skipping enrollment email (explicit)", email);
            continue;
          }

          emails.push(email);
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.size < CHUNK_SIZE) break;
      }

      functions.logger.info("Final enrolled email count", {
        courseId,
        count: emails.length,
      });

      return emails;
    } catch (error) {
      logger.error("Error fetching course enrolled emails", error);
      return [];
    }
  }
}
export const enrollmentService = new EnrollmentService();
