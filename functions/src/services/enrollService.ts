import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { bundleService } from './bundleService';
import { Result, ok, fail } from '../utils/response';
import { COLLECTION, ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS } from '../constants';
import { EnrolledProgramType } from '../types/general';
import { Enrollment } from '../types/enrollment';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type EnrollmentItem = {
  itemId: string;
  itemType: EnrolledProgramType;
};

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
    userId: string,
    items: EnrollmentItem[],
    orderId: string
  ): Promise<Result<string[]>> {
    if (!items || items.length === 0) return ok([]);

    const batch = db.batch();
    const enrollmentIds: string[] = [];

    try {
      for (const item of items) {
        if (item.itemType === ENROLLED_PROGRAM_TYPE.COURSE) {
          const enrollmentId = this.generateEnrollmentId(userId, item.itemId);
          enrollmentIds.push(enrollmentId);

          // Create enrollment for single course
          const enrollment: Enrollment = {
            id: enrollmentId,
            userId,
            courseId: item.itemId,
            bundleId: '', // Empty for course enrollments
            enrollmentDate: FieldValue.serverTimestamp(),
            status: ENROLLMENT_STATUS.ACTIVE,
            orderId: orderId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };

          batch.set(db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId), enrollment);

        } else if (item.itemType === ENROLLED_PROGRAM_TYPE.BUNDLE) {
          // Bundle enrollment - create enrollments for each course in the bundle
          const bundleResult = await bundleService.getBundleById(item.itemId);
          if (!bundleResult.success || !bundleResult.data) {
            return fail("Bundle not found");
          }

          const bundleCourseIds = bundleResult.data.courses.map(c => c.id);

          // Create individual course enrollments for each course in the bundle
          for (const courseId of bundleCourseIds) {
            const courseEnrollmentId = this.generateEnrollmentId(userId, courseId);
            enrollmentIds.push(courseEnrollmentId);

            const courseEnrollment: Enrollment = {
              id: courseEnrollmentId,
              userId,
              courseId: courseId,
              bundleId: item.itemId, // Reference to parent bundle
              enrollmentDate: FieldValue.serverTimestamp(),
              status: ENROLLMENT_STATUS.ACTIVE,
              orderId: orderId,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            batch.set(db.collection(COLLECTION.ENROLLMENTS).doc(courseEnrollmentId), courseEnrollment);
          }
        }
      }

      // Commit the batch
      await batch.commit();
      functions.logger.info(`Created enrollment intent for user ${userId} with order ${orderId}`);

      return ok(enrollmentIds);

    } catch (error: any) {
      functions.logger.error('Error creating enrollment intent:', error);
      return fail("Enrollment intent creation failed", error.message);
    }
  }

  /**
   * Enroll user in free course (immediately active)
   */
  async enrollUserInFreeCourse(
    userId: string,
    courseId: string
  ): Promise<Result<string>> {
    if (!userId) return fail("Invalid user ID");
    if (!courseId) return fail("Invalid course ID");

    try {
      const userDocRef = db.collection(COLLECTION.USERS).doc(userId);
      const userSnap = await userDocRef.get();

      if (!userSnap.exists) {
        return fail("User does not exist");
      }

      const enrollmentId = this.generateEnrollmentId(userId, courseId);
      const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
      const enrollmentSnap = await enrollmentRef.get();

      if (enrollmentSnap.exists) {
        return ok(enrollmentId);
      }

      const enrollment: Enrollment = {
        id: enrollmentId,
        userId,
        courseId: courseId,
        bundleId: '', // Empty for free course
        enrollmentDate: FieldValue.serverTimestamp(),
        status: ENROLLMENT_STATUS.ACTIVE,
        orderId: '', // Empty for free courses
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await enrollmentRef.set(enrollment);
      functions.logger.info(`Successfully enrolled user ${userId} in free course ${courseId}`);

      return ok(enrollmentId);
    } catch (error: any) {
      functions.logger.error('Error enrolling user in free course:', error);
      return fail("Enrollment in free course failed", error.message);
    }
  }
}

export const enrollmentService = new EnrollmentService();
