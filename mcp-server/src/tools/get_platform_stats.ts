import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const getPlatformStatsSchema = {};

export async function getPlatformStats() {
  // Run all counts in parallel
  const [
    usersSnap,
    coursesSnap,
    enrollmentsSnap,
    ordersSnap,
    bundlesSnap,
    quizzesSnap,
    couponsSnap,
    announcementsSnap,
  ] = await Promise.all([
    db.collection(COLLECTION.USERS).count().get(),
    db.collection(COLLECTION.COURSES).count().get(),
    db.collection(COLLECTION.ENROLLMENTS).count().get(),
    db.collection(COLLECTION.ORDERS).count().get(),
    db.collection(COLLECTION.BUNDLES).count().get(),
    db.collection(COLLECTION.QUIZZES).count().get(),
    db.collection(COLLECTION.COUPONS).count().get(),
    db.collection(COLLECTION.ANNOUNCEMENTS).count().get(),
  ]);

  // Get breakdowns for key collections
  const [
    activeEnrollments,
    completedEnrollments,
    droppedEnrollments,
    publishedCourses,
    draftCourses,
    archivedCourses,
    completedOrders,
    pendingOrders,
    activeStudents,
    teachers,
    instructors,
    admins,
  ] = await Promise.all([
    db.collection(COLLECTION.ENROLLMENTS).where("status", "==", "ACTIVE").count().get(),
    db.collection(COLLECTION.ENROLLMENTS).where("status", "==", "COMPLETED").count().get(),
    db.collection(COLLECTION.ENROLLMENTS).where("status", "==", "DROPPED").count().get(),
    db.collection(COLLECTION.COURSES).where("status", "==", "PUBLISHED").count().get(),
    db.collection(COLLECTION.COURSES).where("status", "==", "DRAFT").count().get(),
    db.collection(COLLECTION.COURSES).where("status", "==", "ARCHIVED").count().get(),
    db.collection(COLLECTION.ORDERS).where("status", "==", "COMPLETED").count().get(),
    db.collection(COLLECTION.ORDERS).where("status", "==", "PENDING").count().get(),
    db.collection(COLLECTION.USERS).where("role", "==", "STUDENT").count().get(),
    db.collection(COLLECTION.USERS).where("role", "==", "TEACHER").count().get(),
    db.collection(COLLECTION.USERS).where("role", "==", "INSTRUCTOR").count().get(),
    db.collection(COLLECTION.USERS).where("role", "==", "ADMIN").count().get(),
  ]);

  return {
    totals: {
      users: usersSnap.data().count,
      courses: coursesSnap.data().count,
      enrollments: enrollmentsSnap.data().count,
      orders: ordersSnap.data().count,
      bundles: bundlesSnap.data().count,
      quizzes: quizzesSnap.data().count,
      coupons: couponsSnap.data().count,
      announcements: announcementsSnap.data().count,
    },
    users: {
      students: activeStudents.data().count,
      teachers: teachers.data().count,
      instructors: instructors.data().count,
      admins: admins.data().count,
    },
    courses: {
      published: publishedCourses.data().count,
      draft: draftCourses.data().count,
      archived: archivedCourses.data().count,
    },
    enrollments: {
      active: activeEnrollments.data().count,
      completed: completedEnrollments.data().count,
      dropped: droppedEnrollments.data().count,
    },
    orders: {
      completed: completedOrders.data().count,
      pending: pendingOrders.data().count,
    },
    generatedAt: new Date().toISOString(),
  };
}
