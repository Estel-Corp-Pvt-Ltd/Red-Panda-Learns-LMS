import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COURSE_STATUS, USER_STATUS } from "@/constants";
import { Course } from "@/types/course";
import { User } from "@/types/user";

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
  totalCourses: number;
  activeCohorts: number;
  totalCohorts: number;
  cohortStudents: number;
};

/**
 * Service responsible for fetching and aggregating
 * application-wide statistics like revenue, students, courses, and cohorts.
 */
class StatisticsService {
  /**
   * Returns all dashboard statistics needed for the analytics cards.
   *
   * @returns A `DashboardStats` object containing:
   *  - `totalRevenue`: Total revenue from payments
   *  - `revenueGrowth`: Percentage growth vs last month
   *  - `activeStudents`: Count of active students
   *  - `activeStudentGrowth`: Growth vs last month
   *  - `newEnrollments`: Number of new enrollments this month
   *  - `enrollmentGrowth`: % growth of enrollments vs last month
   *  - `totalCourses`: Total available courses
   *  - `activeCohorts`: Currently active cohorts
   *  - `totalCohorts`: Total cohorts (any status)
   *  - `cohortStudents`: Students enrolled across cohorts
   */
  async getDashboardStats(): Promise<DashboardStats> {
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

    return {
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
    };
  }

  // ==========================================================
  // 📊 Revenue
  // ==========================================================

  /**
   * Calculates total revenue across all payments.
   *
   * @returns Total revenue amount (in smallest currency units or formatted as needed).
   */
  async getTotalRevenue(): Promise<number> {
    const snapshot = await getDocs(collection(db, "Payments"));
    let total = 0;
    snapshot.forEach((doc) => {
      total += doc.data().amount || 0;
    });
    return total;
  }

  /**
   * Calculates revenue growth as a percentage compared to last month.
   * 
   * @returns Revenue growth percentage (positive or negative)
   */
  async getRevenueGrowth(): Promise<number> {
    // TODO: Replace logic with real monthly comparison
    return 20.1; // placeholder
  }

  // ==========================================================
  // 👩‍🎓 Students
  // ==========================================================

  /**
   * Counts all students with status = ACTIVE.
   *
   * @returns Number of active students.
   */
  async getActiveStudentsCount(): Promise<number> {
    const q = query(
      collection(db, "Users"),
      where("status", "==", USER_STATUS.ACTIVE)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Calculates the growth of active students vs last month.
   *
   * @returns Active student growth percentage.
   */
  async getActiveStudentsGrowth(): Promise<number> {
    // TODO: calculate from createdAt timestamps
    return 180.1; // placeholder
  }

  // ==========================================================
  // 📝 Enrollments
  // ==========================================================

  /**
   * Counts total new enrollments (this month).
   *
   * @returns Number of new enrollments
   */
  async getNewEnrollments(): Promise<number> {
    const snapshot = await getDocs(collection(db, "Enrollments"));
    return snapshot.size;
  }

  /**
   * Calculates enrollment growth percentage vs previous month.
   *
   * @returns Enrollment growth percentage.
   */
  async getEnrollmentsGrowth(): Promise<number> {
    // TODO: calculate from createdAt timestamps
    return 19; // placeholder
  }

  // ==========================================================
  // 📚 Courses
  // ==========================================================

  /**
   * Returns the total number of courses available.
   *
   * @returns Number of courses in the system.
   */
  async getTotalCourses(): Promise<number> {
    const snapshot = await getDocs(collection(db, "Courses"));
    return snapshot.size;
  }

  // ==========================================================
  // 🎓 Cohorts
  // ==========================================================

  /**
   * Counts how many cohorts are currently active.
   *
   * @returns Number of active cohorts
   */
  async getActiveCohorts(): Promise<number> {
    const q = query(collection(db, "Cohorts"), where("status", "==", "ACTIVE"));
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Returns the total number of cohorts in the system.
   *
   * @returns Number of cohorts
   */
  async getTotalCohorts(): Promise<number> {
    const snapshot = await getDocs(collection(db, "Cohorts"));
    return snapshot.size;
  }

  /**
   * Counts all students enrolled across cohorts.
   *
   * @returns Number of students across all cohorts
   */
  async getCohortStudents(): Promise<number> {
    const snapshot = await getDocs(collection(db, "Cohorts"));
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