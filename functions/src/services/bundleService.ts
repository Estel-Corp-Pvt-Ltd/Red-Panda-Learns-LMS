import * as admin from 'firebase-admin';
import { courseService } from './courseService';
import { Bundle } from '../types/bundle';
import { Course } from '../types/course';
import { fail, ok, Result } from '../utils/response';
import { COLLECTION } from "../constants";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

class BundleService {

  async getBundleById(bundleId: string): Promise<Result<Bundle>> {
    try {
      const bundleDoc = await db.collection(COLLECTION.BUNDLES).doc(bundleId).get();

      if (!bundleDoc.exists) {
        return fail("");
      }

      const data = bundleDoc.data();
      const bundle = {
        ...data,
        id: bundleDoc.id,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      } as Bundle;

      return ok(bundle);
    } catch (error) {
      return fail("Failed to fetch bundle");
    }
  }

  async getBundleCourses(bundleId: string): Promise<Result<Course[]>> {
    try {
      const bundleResult = await this.getBundleById(bundleId);
      if (!bundleResult.success || !bundleResult.data) {
        return fail("Bundle not found");
      }

      // Get all course results
      const courseResults = await Promise.all(
        bundleResult.data.courses.map((course) => courseService.getCourseById(course.id))
      );

      // Filter for successful results and extract data
      const validCourses = courseResults
        .filter((result): result is { success: true; data: Course } =>
          result.success && result.data !== null
        )
        .map(result => result.data);

      return ok(validCourses);
    } catch (error) {
      return fail("Failed to fetch bundle courses");
    }
  }
};

export const bundleService = new BundleService();
