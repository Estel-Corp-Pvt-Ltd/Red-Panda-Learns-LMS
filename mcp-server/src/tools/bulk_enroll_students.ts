import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

export const bulkEnrollStudentsSchema = {
  courseId: z.string().describe("The course ID to enroll students in"),
  emails: z.array(z.string()).describe("Array of student email addresses to enroll"),
};

export async function bulkEnrollStudents(params: {
  courseId: string;
  emails: string[];
}) {
  // Verify course exists
  const courseDoc = await db.collection(COLLECTION.COURSES).doc(params.courseId).get();
  if (!courseDoc.exists) {
    throw new Error(`Course not found: ${params.courseId}`);
  }
  const courseData = courseDoc.data()!;

  const results: {
    enrolled: { email: string; userId: string; userName: string }[];
    alreadyEnrolled: { email: string; userId: string }[];
    notFound: string[];
    errors: { email: string; error: string }[];
  } = {
    enrolled: [],
    alreadyEnrolled: [],
    notFound: [],
    errors: [],
  };

  // Process in batches of 10 (Firestore "in" query limit)
  const CHUNK_SIZE = 10;
  const BATCH_LIMIT = 500;

  // First, resolve all emails to users
  const userMap = new Map<string, { id: string; name: string; email: string }>();

  for (let i = 0; i < params.emails.length; i += CHUNK_SIZE) {
    const chunk = params.emails.slice(i, i + CHUNK_SIZE);
    const snap = await db
      .collection(COLLECTION.USERS)
      .where("email", "in", chunk)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      const name = [d.firstName, d.middleName, d.lastName]
        .filter((n: string) => n && n.trim() !== "")
        .join(" ");
      userMap.set(d.email.toLowerCase(), { id: doc.id, name, email: d.email });
    }
  }

  // Identify not-found emails
  for (const email of params.emails) {
    if (!userMap.has(email.toLowerCase())) {
      results.notFound.push(email);
    }
  }

  // Enroll found users in batches
  const usersToEnroll = Array.from(userMap.values());

  for (let i = 0; i < usersToEnroll.length; i += BATCH_LIMIT) {
    const batchUsers = usersToEnroll.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    const batchEnrolled: typeof results.enrolled = [];

    for (const user of batchUsers) {
      try {
        const enrollmentId = `${user.id}_${params.courseId}`;
        const existingDoc = await db
          .collection(COLLECTION.ENROLLMENTS)
          .doc(enrollmentId)
          .get();

        if (existingDoc.exists && existingDoc.data()?.status === "ACTIVE") {
          results.alreadyEnrolled.push({ email: user.email, userId: user.id });
          continue;
        }

        const enrollment = {
          id: enrollmentId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
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

        batch.set(db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId), enrollment);

        // Create learning progress if not exists
        const progressId = `${user.id}_${params.courseId}`;
        const progressDoc = await db
          .collection(COLLECTION.LEARNING_PROGRESS)
          .doc(progressId)
          .get();

        if (!progressDoc.exists) {
          batch.set(db.collection(COLLECTION.LEARNING_PROGRESS).doc(progressId), {
            id: progressId,
            userId: user.id,
            courseId: params.courseId,
            completedLessons: [],
            completedAssignments: [],
            lastAccessedLesson: null,
            totalTimeSpent: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        batchEnrolled.push({ email: user.email, userId: user.id, userName: user.name });
      } catch (err: any) {
        results.errors.push({ email: user.email, error: err.message });
      }
    }

    if (batchEnrolled.length > 0) {
      await batch.commit();
      results.enrolled.push(...batchEnrolled);
    }
  }

  return {
    courseId: params.courseId,
    courseName: courseData.title,
    summary: {
      totalRequested: params.emails.length,
      enrolled: results.enrolled.length,
      alreadyEnrolled: results.alreadyEnrolled.length,
      notFound: results.notFound.length,
      errors: results.errors.length,
    },
    enrolled: results.enrolled,
    alreadyEnrolled: results.alreadyEnrolled,
    notFound: results.notFound,
    errors: results.errors,
    message: `Bulk enrollment complete: ${results.enrolled.length} enrolled, ${results.alreadyEnrolled.length} already enrolled, ${results.notFound.length} not found`,
  };
}
