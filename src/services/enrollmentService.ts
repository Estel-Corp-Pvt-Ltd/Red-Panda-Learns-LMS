
import { doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Course } from '@/types/course';
import { Bundle, BundleEnrollment } from '@/types/bundle';
import { bundleService } from './bundleService';
import { serverTimestamp } from 'firebase/firestore';
import { User } from '@/types/user';
import { EnrolledProgramType } from '@/types/general';
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  paymentId?: string;
  paymentProvider?: string;
  amount: number;
  status: 'active' | 'suspended' | 'completed';
  progress: {
    completedLessons: string[];
    currentLesson?: string;
    progressPercentage: number;
  };
}

class EnrollmentService {
  // Normalize course ID to string format for consistent storage
  private normalizeCourseId(courseId: string | number): string {
    return String(courseId);
  }

  async enrollUser(
    userId: string,
    course: Course,
    paymentId?: string,
    paymentProvider?: string
  ): Promise<void> {
    try {
      const normalizedCourseId = this.normalizeCourseId(course?.id);
      console.log(normalizedCourseId)

      // console.log('EnrollmentService - Starting enrollment:', {
      //   userId,
      //   courseId: course.ID,
      //   normalizedCourseId,
      //   paymentId,
      //   paymentProvider
      // });

      const enrollmentId = `${userId}_${normalizedCourseId}`;
      console.log(enrollmentId)
      const enrollment: Partial<Enrollment> = {
        id: enrollmentId,
        userId,
        courseId: normalizedCourseId,
        enrolledAt: new Date(),
        amount: course.salePrice || 0,
        status: 'active',
        progress: {
          completedLessons: [],
          progressPercentage: 0,
        },
      };

      if (paymentId) {
        enrollment.paymentId = paymentId;
      }
      if (paymentProvider) {
        enrollment.paymentProvider = paymentProvider;
      }
      console.log(enrollment)
      const targetId = normalizedCourseId; 
const targetType: EnrolledProgramType = "COURSE";
      // Create enrollment document
      await setDoc(doc(db, 'enrollments', enrollmentId), enrollment as Enrollment);
      console.log("SET DOC HOGAYA")
      // console.log('EnrollmentService - Enrollment document created:', enrollmentId);
      


        try{
    const userDocRef = doc(db, "Users", userId);

await updateDoc(userDocRef, {
  enrollments: arrayUnion({ targetId, targetType }) as unknown as User["enrollments"],
  updatedAt: serverTimestamp() as unknown as Date,
});
    }
    catch(error){
      console.log("Heyy this is error",error)
    }
      

      // console.log('EnrollmentService - User enrolled successfully:', {
      //   enrollmentId,
      //   userId,
      //   courseId: normalizedCourseId
      // });
    } catch (error) {
      // console.error('EnrollmentService - Error enrolling user:', error);
      throw new Error('Failed to enroll user');
    }
  }

  async checkEnrollment(userId: string, courseId: string | number): Promise<boolean> {
    try {
      const normalizedCourseId = this.normalizeCourseId(courseId);
      // console.log('EnrollmentService - Checking enrollment:', { userId, courseId, normalizedCourseId });

      // Check direct course enrollment
      const enrollmentId = `${userId}_${normalizedCourseId}`;
      const enrollmentDoc = await getDoc(doc(db, 'enrollments', enrollmentId));
      const isDirectlyEnrolled = enrollmentDoc.exists() && enrollmentDoc.data()?.status === 'active';

      if (isDirectlyEnrolled) {
        return true;
      }

      // Check bundle enrollments
      const isBundleEnrolled = await this.checkBundleEnrollment(userId, normalizedCourseId);

      // console.log('EnrollmentService - Enrollment check result:', { 
      //   enrollmentId, 
      //   directEnrollment: isDirectlyEnrolled,
      //   bundleEnrollment: isBundleEnrolled,
      //   isEnrolled: isDirectlyEnrolled || isBundleEnrolled
      // });

      return isDirectlyEnrolled || isBundleEnrolled;
    } catch (error) {
      // console.error('EnrollmentService - Error checking enrollment:', error);
      return false;
    }
  }

  async checkBundleEnrollment(userId: string, courseId: string): Promise<boolean> {
    try {
      // Query bundle enrollments where the user is enrolled and the bundle contains this course
      const q = query(
        collection(db, 'bundleEnrollments'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        where('enrolledCourseIds', 'array-contains', courseId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('EnrollmentService - Error checking bundle enrollment:', error);
      return false;
    }
  }

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    try {
      // console.log('EnrollmentService - Getting user enrollments:', userId);
      const q = query(
        collection(db, 'enrollments'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);

      const enrollments = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt.toDate(),
      })) as Enrollment[];

      // console.log('EnrollmentService - User enrollments fetched:', {
      //   userId,
      //   count: enrollments.length,
      //   courseIds: enrollments.map(e => e.courseId)
      // });

      return enrollments;
    } catch (error) {
      // console.error('EnrollmentService - Error fetching user enrollments:', error);
      return [];
    }
  }

  async updateProgress(
    userId: string,
    courseId: string | number,
    lessonId: string
  ): Promise<void> {
    try {
      const normalizedCourseId = this.normalizeCourseId(courseId);
      // console.log('EnrollmentService - Updating progress:', { userId, courseId: normalizedCourseId, lessonId });

      const enrollmentId = `${userId}_${normalizedCourseId}`;
      const enrollmentRef = doc(db, 'enrollments', enrollmentId);

      const enrollmentDoc = await getDoc(enrollmentRef);
      if (!enrollmentDoc.exists()) {
        // console.log('EnrollmentService - Enrollment not found for progress update');
        return;
      }

      const enrollment = enrollmentDoc.data() as Enrollment;
      const completedLessons = enrollment.progress.completedLessons || [];

      if (!completedLessons.includes(lessonId)) {
        await updateDoc(enrollmentRef, {
          'progress.completedLessons': arrayUnion(lessonId),
          'progress.currentLesson': lessonId,
        });
        // console.log('EnrollmentService - Progress updated successfully');
      }
    } catch (error) {
      console.error('EnrollmentService - Error updating progress:', error);
    }
  }

  // Bundle enrollment methods
  async enrollUserInBundle(
    userId: string,
    bundle: Bundle,
    paymentId?: string,
    paymentProvider?: string
  ): Promise<void> {
    try {
      console.log('EnrollmentService - Starting bundle enrollment:', {
        userId,
        bundleId: bundle.id,
        // courseCount: bundle.courseIds.length,
        paymentId,
        paymentProvider
      });

      // Get all courses in the bundle
      const bundleCourses = await bundleService.getBundleCourses(bundle.id);

      if (bundleCourses.length === 0) {
        throw new Error('No valid courses found in bundle');
      }

      // Create individual course enrollments for each course in the bundle
      const enrolledCourseIds: string[] = [];

      for (const course of bundleCourses) {
        try {
          // Convert course service Course to API Course format for enrollment
          const courseIdStr = course.id!;
          const courseIdNum = parseInt(courseIdStr.replace(/\D/g, '')) || parseInt(courseIdStr) || 0;

          const apiCourse: Course = course;

          console.log('EnrollmentService - Creating individual course enrollment:', {
            courseId: course.id,
            normalizedId: courseIdNum,
            apiCourseId: apiCourse.id
          });

          await this.enrollUser(userId, apiCourse, paymentId, paymentProvider);
          enrolledCourseIds.push(this.normalizeCourseId(course.id!));
        } catch (error) {
          console.error(`Failed to enroll in course ${course.id}:`, error);
          // Continue with other courses rather than failing completely
        }
      }

      // Create bundle enrollment record
      const bundleEnrollmentId = `${userId}_${bundle.id}`;
      const bundleEnrollment: BundleEnrollment = {
        id: bundleEnrollmentId,
        userId,
        bundleId: bundle.id,
        enrolledAt: new Date(),
        amount: bundle.salePrice,
        status: 'active',
        enrolledCourseIds,
        paymentId: paymentId || null,
        paymentProvider: paymentProvider || null,
      };

      await setDoc(doc(db, 'bundleEnrollments', bundleEnrollmentId), bundleEnrollment);

      // Update user's bundle enrollments
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        bundleEnrollments: arrayUnion(bundle.id),
      });

      console.log('EnrollmentService - Bundle enrollment completed:', {
        bundleEnrollmentId,
        enrolledCourseIds,
        totalEnrolled: enrolledCourseIds.length
      });
    } catch (error) {
      console.error('EnrollmentService - Error enrolling user in bundle:', error);
      throw new Error('Failed to enroll user in bundle');
    }
  }

  async getUserBundleEnrollments(userId: string): Promise<BundleEnrollment[]> {
    try {
      const q = query(
        collection(db, 'bundleEnrollments'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);

      const bundleEnrollments = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt.toDate(),
      })) as BundleEnrollment[];

      console.log('EnrollmentService - User bundle enrollments fetched:', {
        userId,
        count: bundleEnrollments.length,
        bundleIds: bundleEnrollments.map(e => e.bundleId)
      });

      return bundleEnrollments;
    } catch (error) {
      console.error('EnrollmentService - Error fetching user bundle enrollments:', error);
      return [];
    }
  }

  async checkBundleEnrollmentStatus(userId: string, bundleId: string): Promise<boolean> {
    try {
      const bundleEnrollmentId = `${userId}_${bundleId}`;
      const bundleEnrollmentDoc = await getDoc(doc(db, 'bundleEnrollments', bundleEnrollmentId));

      return bundleEnrollmentDoc.exists() && bundleEnrollmentDoc.data()?.status === 'active';
    } catch (error) {
      console.error('EnrollmentService - Error checking bundle enrollment status:', error);
      return false;
    }
  }
}

export const enrollmentService = new EnrollmentService();
