import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Enrollment } from '@/types/enrollment';
import { CURRENCY, ENROLLMENT_STATUS, PAYMENT_PROVIDER, PAYMENT_STATUS, USER_ROLE } from '@/constants';
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
                programType,
                enrollmentDate: new Date(),
                status: ENROLLMENT_STATUS.ACTIVE, // default
                role: USER_ROLE.STUDENT,  // default
                currentLessonId,
                progress: {
                    completedLessons: 0,
                    totalLessons: 0,
                    percentage: 0,
                },
                lastAccessed: new Date(),
                completionDate: null,
                certificateIssued: false,
                grade: null,
                payment: {
                    status: PAYMENT_STATUS.PENDING,
                    actualAmount: 0,
                    currency: CURRENCY.INR,
                    amountPaid: 0,
                    balance: 0,
                    transactionId: null,
                    provider: PAYMENT_PROVIDER.RAZORPAY,
                    paidAt: null,
                },
            };

            await setDoc(doc(db, 'Enrollments', enrollmentId), enrollment);
            console.log('EnrollmentService - User enrolled successfully:', enrollmentId);

            return enrollmentId;
        } catch (error) {
            console.error('EnrollmentService - Error enrolling user:', error);
            throw new Error('Failed to enroll user');
        }
    }

    /**
     * Checks if a user is enrolled in a specific course/bundle.
     */
    async isUserEnrolled(userId: string, targetId: string): Promise<boolean> {
        try {
            const q = query(
                collection(db, 'Enrollments'),
                where('userId', '==', userId),
                where('targetId', '==', targetId)
            );

            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('EnrollmentService - Error checking enrollment:', error);
            return false;
        }
    }

    /**
     * Gets all enrollments for a specific user.
     */
    async getUserEnrollments(userId: string): Promise<Enrollment[]> {
        try {
            const q = query(collection(db, 'Enrollments'), where('userId', '==', userId));
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
