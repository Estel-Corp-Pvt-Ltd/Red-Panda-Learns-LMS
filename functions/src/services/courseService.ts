import { COLLECTION } from '../constants';
import { Course } from '../types/course';
import { ok, fail, Result } from '../utils/response';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();


class CourseService {
  async getCourseById(courseId: string): Promise<Result<Course | null>> {
    try {
      const courseDoc = await db.collection(COLLECTION.COURSES).doc(courseId).get();

      if (!courseDoc.exists) {
        return fail("Course not found");
      }

      const data = courseDoc.data();
      const course: Course = {
        id: courseDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      } as Course;

      return ok(course);
    } catch (error) {
      return fail('Failed to fetch course');
    }
  }
}

export const courseService = new CourseService();
