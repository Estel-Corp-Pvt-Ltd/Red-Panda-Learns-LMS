import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const enrollStudentSchema = {
  courseId: z.string().describe("The course ID to enroll the student in"),
  userId: z.string().optional().describe("The user ID to enroll. Provide either userId or userEmail."),
  userEmail: z.string().optional().describe("The user email to enroll. Will look up userId from email."),
};

export async function enrollStudent(params: {
  courseId: string;
  userId?: string;
  userEmail?: string;
}) {
  if (!params.userId && !params.userEmail) {
    throw new Error("Must provide either userId or userEmail");
  }

  // Resolve user
  let userId = params.userId;
  let userName = "";
  let userEmail = params.userEmail ?? "";

  if (!userId && userEmail) {
    // Look up user by email
    const userSnap = await db
      .collection(COLLECTION.USERS)
      .where("email", "==", userEmail)
      .limit(1)
      .get();

    if (userSnap.empty) {
      throw new Error(`User not found with email: ${userEmail}`);
    }

    const userData = userSnap.docs[0].data();
    userId = userSnap.docs[0].id;
    userName = [userData.firstName, userData.middleName, userData.lastName]
      .filter((n: string) => n && n.trim() !== "")
      .join(" ");
    userEmail = userData.email;
  } else if (userId) {
    // Look up user by ID
    const userDoc = await db.collection(COLLECTION.USERS).doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`User not found: ${userId}`);
    }
    const userData = userDoc.data()!;
    userName = [userData.firstName, userData.middleName, userData.lastName]
      .filter((n: string) => n && n.trim() !== "")
      .join(" ");
    userEmail = userData.email;
  }

  // Verify course exists
  const courseDoc = await db.collection(COLLECTION.COURSES).doc(params.courseId).get();
  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }
  const courseData = courseDoc.data()!;

  // Check for existing enrollment
  const enrollmentId = `${userId}_${params.courseId}`;
  const existingEnrollment = await db
    .collection(COLLECTION.ENROLLMENTS)
    .doc(enrollmentId)
    .get();

  if (existingEnrollment.exists) {
    const existingData = existingEnrollment.data()!;
    if (existingData.status === "ACTIVE") {
      return {
        enrollmentId,
        userId,
        userName,
        userEmail,
        courseId: params.courseId,
        courseName: courseData.title,
        status: "ACTIVE",
        message: `Student "${userName}" is already enrolled in "${courseData.title}"`,
        alreadyEnrolled: true,
      };
    }
  }

  // Create enrollment
  const enrollment = {
    id: enrollmentId,
    userId,
    userName,
    userEmail,
    courseId: params.courseId,
    courseName: courseData.title,
    bundleId: "",
    enrollmentDate: FieldValue.serverTimestamp(),
    status: "ACTIVE",
    orderId: "Admin Enrollment",
    completionDate: null,
    certification: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId).set(enrollment);

  // Create learning progress document
  const progressId = `${userId}_${params.courseId}`;
  const progressDoc = await db.collection(COLLECTION.LEARNING_PROGRESS).doc(progressId).get();

  if (!progressDoc.exists) {
    await db.collection(COLLECTION.LEARNING_PROGRESS).doc(progressId).set({
      id: progressId,
      userId,
      courseId: params.courseId,
      completedLessons: [],
      completedAssignments: [],
      lastAccessedLesson: null,
      totalTimeSpent: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    enrollmentId,
    userId,
    userName,
    userEmail,
    courseId: params.courseId,
    courseName: courseData.title,
    status: "ACTIVE",
    alreadyEnrolled: false,
    message: `Student "${userName}" enrolled in "${courseData.title}" successfully`,
  };
}
