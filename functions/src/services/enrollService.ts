import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { bundleService } from "./bundleService";
import { Result, ok, fail } from "../utils/response";
import {
  COLLECTION,
  ENROLLED_PROGRAM_TYPE,
  ENROLLMENT_STATUS,
} from "../constants";
import { Enrollment } from "../types/enrollment";
import { FieldValue } from "firebase-admin/firestore";
import { TransactionLineItem } from "../types/transaction";
import { courseService } from "./courseService";
import { User } from "../types/user";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class EnrollmentService {
  /**
   * Generates a unique enrollment ID in the format: <userId>_<courseId>
   */
  private generateEnrollmentId(userId: string, courseId: string): string {
    return `${userId}_${courseId}`;
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

    try {
      for (const item of items) {
        if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
          const enrollmentId = this.generateEnrollmentId(user.id, item.itemId);
          enrollmentIds.push(enrollmentId);

          // Create enrollment for single course
          const enrollment: Enrollment = {
            id: enrollmentId,
            userId: user.id,
            userName: `${user.firstName} ${user.middleName} ${user.lastName}`,
            userEmail: user.email,
            courseId: item.itemId,
            courseName: item.name,
            bundleId: "", // Empty for course enrollments
            enrollmentDate: FieldValue.serverTimestamp(),
            status: ENROLLMENT_STATUS.ACTIVE,
            orderId: orderId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          batch.set(
            db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId),
            enrollment
          );
        } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
          // Bundle enrollment - create enrollments for each course in the bundle
          const bundleResult = await bundleService.getBundleById(item.itemId);
          if (!bundleResult.success || !bundleResult.data) {
            return fail("Bundle not found");
          }

          const bundleCourses = bundleResult.data.courses;

          // Create individual course enrollments for each course in the bundle
          for (const course of bundleCourses) {
            const courseEnrollmentId = this.generateEnrollmentId(
              user.id,
              course.id
            );
            enrollmentIds.push(courseEnrollmentId);

            const courseEnrollment: Enrollment = {
              id: courseEnrollmentId,
              userId: user.id,
              userName: `${user.firstName} ${user.middleName} ${user.lastName}`,
              userEmail: user.email,
              courseId: course.id,
              courseName: course.title,
              bundleId: item.itemId, // Reference to parent bundle
              enrollmentDate: FieldValue.serverTimestamp(),
              status: ENROLLMENT_STATUS.ACTIVE,
              orderId: orderId,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            batch.set(
              db.collection(COLLECTION.ENROLLMENTS).doc(courseEnrollmentId),
              courseEnrollment
            );
          }
        }
      }

      // Commit the batch
      await batch.commit();
      functions.logger.info(
        `Created enrollment intent for user ${user.id} with order ${orderId}`
      );

      return ok(enrollmentIds);
    } catch (error: any) {
      functions.logger.error("Error creating enrollment intent:", error);
      return fail("Enrollment intent creation failed", error.message);
    }
  }

  /**
   * Enroll user in free course (immediately active)
   */
  async enrollUserInFreeCourse(
    user: User,
    courseId: string
  ): Promise<Result<string>> {
    if (!user) return fail("Invalid user");
    if (!courseId) return fail("Invalid course ID");

    try {
      const courseResult = await courseService.getCourseById(courseId);
      if (!courseResult.success || !courseResult.data) {
        return fail("Course not found");
      }
      const enrollmentId = this.generateEnrollmentId(user.id, courseId);
      const enrollmentRef = db
        .collection(COLLECTION.ENROLLMENTS)
        .doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (enrollmentSnap.exists) {
        return ok(enrollmentId);
      }

      const enrollment: Enrollment = {
        id: enrollmentId,
        userId: user.id,
        userName: `${user.firstName} ${user.middleName} ${user.lastName}`,
        userEmail: user.email,
        courseId: courseId,
        courseName: courseResult.data.title,
        bundleId: "", // Empty for free course
        enrollmentDate: FieldValue.serverTimestamp(),
        status: ENROLLMENT_STATUS.ACTIVE,
        orderId: "", // Empty for free courses
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await enrollmentRef.set(enrollment);
      functions.logger.info(
        `Successfully enrolled user ${user.id} in free course ${courseId}`
      );

      return ok(enrollmentId);
    } catch (error: any) {
      functions.logger.error("Error enrolling user in free course:", error);
      return fail("Enrollment in free course failed", error.message);
    }
  }

  isUserEnrolledInCourse = async (
    userId: string,
    courseId: string
  ): Promise<Result<boolean>> => {
    try {
      const enrollmentId = this.generateEnrollmentId(userId, courseId);
      const enrollmentRef = db
        .collection(COLLECTION.ENROLLMENTS)
        .doc(enrollmentId);
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
    const CHUNK_SIZE = 500; // Firestore max is 1000, but keep some margin
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

        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
          const data = doc.data();

          // You said email already exists here
          if (data.userEmail) {
            emails.push(data.userEmail);
          }
        }

        // Move cursor forward
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        // Optional safety break (avoid infinite loop if something weird happens)
        if (snapshot.size < CHUNK_SIZE) break;
      }

      return emails;
    } catch (error) {
      console.error("Error fetching course enrolled emails:", error);
      return [];
    }
  }
}
export const enrollmentService = new EnrollmentService();
