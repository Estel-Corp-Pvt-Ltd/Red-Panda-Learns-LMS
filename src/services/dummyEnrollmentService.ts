import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
    updateDoc,
    arrayUnion,
    getDoc
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Enrollment } from '@/types/enrollment';
import { CURRENCY, ENROLLED_PROGRAM_TYPE, ENROLLMENT_STATUS, PAYMENT_PROVIDER, PAYMENT_STATUS, PRICING_MODEL, USER_ROLE } from '@/constants';
import { EnrolledProgramType } from '@/types/general';

class EnrollmentService {
    /**
 * Generates a unique enrollment ID in the format: <targetId>_<userId>
 */
    private generateEnrollmentId(userId: string, targetId: string): string {
        return `${targetId}_${userId}`;
    }

    /**
  * Enrolls a user into a course or bundle.
  */
    async enrollUser(
        userId: string,
        targetId: string,
        programType: EnrolledProgramType,
        currentLessonId: string = ''
    ): Promise<string> {
        try {
            const enrollmentId = this.generateEnrollmentId(userId, targetId);

            const enrollment: Enrollment = {
                id: enrollmentId,
                userId,
                targetId: targetId, // could be course or bundle ID
                targetType: programType,
                enrollmentDate: new Date(),
                status: ENROLLMENT_STATUS.ACTIVE, // default
                role: USER_ROLE.STUDENT,  // default
                currentLessonId,
                progress: {
                    completedLessons: 0,
                    lessonHistory: [],
                    totalLessons: 0,
                    percentage: 0,
                },
                lastAccessed: new Date(),
                completionDate: null,
                updatedAt: new Date(),
                certificate: {
                    issued: false
                },
                grade: null,
                pricingModel: PRICING_MODEL.PAID
            };

            await setDoc(doc(db, 'Enrollments', enrollmentId), enrollment);
            console.log('EnrollmentService - User enrolled successfully:', enrollmentId);

            // Update user's enrollments
            const userDocRef = doc(db, 'Users', userId);
            await updateDoc(userDocRef, {
                enrollments: arrayUnion({ targetId, targetType: programType })
            });

            return enrollmentId;
        } catch (error) {
            console.error('EnrollmentService - Error enrolling user:', error);
            throw new Error('Failed to enroll user');
        }
    }

    /**
     * Checks if a user is enrolled in a specific course/bundle.
     */
    async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
        try {
            // 1. Direct course enrollment (O(1))
            const enrollmentId = `${userId}_${courseId}`;
            const enrollmentDoc = await getDoc(doc(db, "Enrollments", enrollmentId));

            if (enrollmentDoc.exists() && enrollmentDoc.data()?.status === ENROLLMENT_STATUS.ACTIVE) {
                return true;
            }

            // 2. Bundle enrollment (O(n) over user’s active bundles, usually very small)
            const q = query(
                collection(db, "Enrollments"),
                where("userId", "==", userId),
                where("targetType", "==", ENROLLED_PROGRAM_TYPE.BUNDLE),
                where("status", "==", ENROLLMENT_STATUS.ACTIVE),
                where("bundleCourseIds", "array-contains", courseId)
            );

            const bundleSnapshot = await getDocs(q);
            return !bundleSnapshot.empty;
        } catch (err) {
            console.error("Error checking enrollment:", err);
            return false;
        }
    }

    /**
     * Gets all enrollments for a specific user.
     */
    async getUserEnrollments(userId: string): Promise<Enrollment[]> {
        try {
            const q = query(
                collection(db, 'Enrollments'),
                where('userId', '==', userId),
                where('status', '==', ENROLLMENT_STATUS.ACTIVE),
            );
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map((doc) => ({
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                updatedAt: doc.data().updatedAt?.toDate(),
            })) as unknown as Enrollment[];
        } catch (error) {
            console.error('EnrollmentService - Error fetching user enrollments:', error);
            return [];
        }
    }

    /**
     * Deletes an enrollment by ID.
     */
    async deleteEnrollment(enrollmentId: string): Promise<void> {
        try {
            await deleteDoc(doc(db, 'Enrollments', enrollmentId));
            console.log('EnrollmentService - Enrollment deleted successfully:', enrollmentId);
        } catch (error) {
            console.error('EnrollmentService - Error deleting enrollment:', error);
            throw new Error('Failed to delete enrollment');
        }
    }
}

export const enrollmentService = new EnrollmentService();
