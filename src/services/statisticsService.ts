import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION, USER_STATUS } from "@/constants";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";

/**
 * Basic statistics response for the new stats page.
 */
export type BasicStats = {
  totalBundles: number;
  totalUsers: number;
  totalEnrollments: number;
};

/**
 * Type for the dashboard statistics response.
 */
export type DashboardStats = {
  totalRevenue: number;
  revenueGrowth: number;
  activeStudents: number;
  activeStudentGrowth: number;
  newEnrollments: number;
  enrollmentGrowth: number;
  totalCohortStudents: number;
  totalCourses: number;
  activeCohorts: number;
  totalCohorts: number;
  cohortStudents: number;
};

class StatisticsService {
  // ==========================================================
  // Basic stats (Bundles, Users, Enrollments)
  // ==========================================================

  async getBasicStats(): Promise<Result<BasicStats>> {
    try {
      const [totalBundles, totalUsers, totalEnrollments] = await Promise.all([
        this.getCollectionCount(COLLECTION.BUNDLES),
        this.getCollectionCount(COLLECTION.USERS),
        this.getCollectionCount(COLLECTION.ENROLLMENTS),
      ]);

      return ok({
        totalBundles,
        totalUsers,
        totalEnrollments,
      });
    } catch (error) {
      logError("StatisticsService.getBasicStats", error);
      return fail("Failed to fetch basic statistics");
    }
  }

  /**
   * Efficiently counts documents in a collection using server-side aggregation.
   * Falls back to getDocs; if both fail, throws to be handled by caller.
   */
  private async getCollectionCount(collectionName: string): Promise<number> {
    const collRef = collection(db, collectionName);
    try {
      const agg = await getCountFromServer(collRef);
      return agg.data().count;
    } catch (err) {
      console.warn(
        `[StatisticsService] getCountFromServer failed for ${collectionName}, falling back to getDocs`,
        err
      );
      try {
        const snapshot = await getDocs(collRef);
        return snapshot.size;
      } catch (e) {
        throw e;
      }
    }
  }

  // ==========================================================
  // Full dashboard analytics
  // ==========================================================

  async getDashboardStats(): Promise<Result<DashboardStats>> {
    try {
      const [
        totalRevenue,
        revenueGrowth,
        activeStudents,
        activeStudentGrowth,
        newEnrollments,
        enrollmentGrowth,
        totalCourses,
        activeCohorts,
        totalCohorts,
        cohortStudents,
      ] = await Promise.all([
        this.getTotalRevenue(),
        this.getRevenueGrowth(),
        this.getActiveStudentsCount(),
        this.getActiveStudentsGrowth(),
        this.getNewEnrollments(),
        this.getEnrollmentsGrowth(),
        this.getTotalCourses(),
        this.getActiveCohorts(),
        this.getTotalCohorts(),
        this.getCohortStudents(),
      ]);

      return ok({
        totalCohortStudents: cohortStudents,
        totalRevenue,
        revenueGrowth,
        activeStudents,
        activeStudentGrowth,
        newEnrollments,
        enrollmentGrowth,
        totalCourses,
        activeCohorts,
        totalCohorts,
        cohortStudents,
      });
    } catch (error) {
      logError("StatisticsService.getDashboardStats", error);
      return fail("Failed to fetch dashboard statistics");
    }
  }

  // ==========================================================
  // Revenue
  // ==========================================================

  private async getTotalRevenue(): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION.TRANSACTIONS));
    let total = 0;
    snapshot.forEach((doc) => {
      total += doc.data().amount || 0;
    });
    return total;
  }

  private async getRevenueGrowth(): Promise<number> {
    return 20.1; // placeholder
  }

  // ==========================================================
  // Students
  // ==========================================================

  private async getActiveStudentsCount(): Promise<number> {
    const q = query(
      collection(db, COLLECTION.USERS),
      where("status", "==", USER_STATUS.ACTIVE)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private async getActiveStudentsGrowth(): Promise<number> {
    return 180.1; // placeholder
  }

  // ==========================================================
  // Enrollments
  // ==========================================================

  private async getNewEnrollments(): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION.ENROLLMENTS));
    return snapshot.size;
  }

  private async getEnrollmentsGrowth(): Promise<number> {
    return 19; // placeholder
  }

  // ==========================================================
  // Courses
  // ==========================================================

  private async getTotalCourses(): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION.COURSES));
    return snapshot.size;
  }

  // ==========================================================
  // Cohorts
  // ==========================================================

  private async getActiveCohorts(): Promise<number> {
    const q = query(
      collection(db, COLLECTION.COHORTS),
      where("status", "==", "ACTIVE")
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  private async getTotalCohorts(): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION.COHORTS));
    return snapshot.size;
  }

  private async getCohortStudents(): Promise<number> {
    const snapshot = await getDocs(collection(db, COLLECTION.COHORTS));
    let total = 0;
    snapshot.forEach((doc) => {
      const cohort = doc.data();
      if (Array.isArray(cohort.students)) {
        total += cohort.students.length;
      }
    });
    return total;
  }
}

export const statisticsService = new StatisticsService();