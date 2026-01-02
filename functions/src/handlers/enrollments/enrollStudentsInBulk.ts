import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { getFunctions } from "firebase-admin/functions";
import { onRequest } from "firebase-functions/v2/https";
import { COLLECTION, USER_ROLE, USER_STATUS } from "../../constants";
import { withMiddleware } from "../../middlewares";
import { corsMiddleware } from "../../middlewares/cors";
import { authMiddleware } from "../../middlewares/auth";

if (!admin.apps.length) admin.initializeApp();

const auth = admin.auth();
const db = admin.firestore();

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    middleName: parts.length === 3 ? parts[1] : "",
    lastName: parts.length === 1 ? "" : parts[parts.length - 1],
  };
};

const cleanEmail = (email: string) => {
  email = email.trim();
  const [local, domain] = email.split("@");
  let cleanedLocal = local.replace(/\.{2,}/g, ".");
  cleanedLocal = cleanedLocal.replace(/\.+$/, "");
  return `${cleanedLocal}@${domain}`;
};

export const processEnrollmentTask = onTaskDispatched(
  {
    region: "us-central1",
  },
  async (request) => {
    let { fullName, email, password, courseId, courseName } = request.data;

    if (!email || !fullName || !courseId || !courseName || !password) {
      functions.logger.info("Enrollment info missing", { data: request.data });
      return;
    }

    email = cleanEmail(email);
    const { firstName, middleName, lastName } = splitName(fullName);

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      functions.logger.info(`⚠️ Already exists: ${email}`);

    } catch {
      userRecord = await auth.createUser({
        email,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true,
        password,
      });
      functions.logger.info(`✅ Created user: ${email}`);
    }

    const uid = userRecord.uid;
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    batch.set(db.collection(COLLECTION.USERS).doc(uid), {
      id: uid,
      email,
      firstName,
      middleName,
      lastName,
      role: USER_ROLE.STUDENT,
      status: USER_STATUS.ACTIVE,
      organizationId: null,
      photoURL: userRecord.photoURL || null,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const enrollmentId = `${uid}_${courseId}`;

    const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
    const existingEnrollment = await enrollmentRef.get();

    if (existingEnrollment.exists) {
      functions.logger.info(`⚠️ Enrollment already exists for ${email} → ${courseName}`);
      return;
    }

    functions.logger.info(`➕ Enrolling ${email} → ${courseName}`);

    batch.set(enrollmentRef, {
      id: enrollmentId,
      userId: uid,
      userName: fullName,
      userEmail: email,
      courseId,
      courseName,
      bundleId: null,
      enrollmentDate: now,
      status: USER_STATUS.ACTIVE,
      orderId: "Admin Enrollment",
      certification: {
        issued: false,
        issuedAt: null,
        certificateId: null,
        grade: null,
        remark: null,
        preferredName: null,
      },
      completionDate: null,
      createdAt: now,
      updatedAt: now,
    });

    const lpRef = db.collection(COLLECTION.LEARNING_PROGRESS).doc();
    batch.set(lpRef, {
      id: lpRef.id,
      userId: uid,
      courseId,
      currentLessonId: null,
      lastAccessed: null,
      lessonHistory: [],
      updatedAt: now,
    });

    await batch.commit();
    functions.logger.info(`✅ Enrollment data committed for ${email}`);
  });

export const enrollStudentsInBulk = onRequest({
  region: "us-central1",
  timeoutSeconds: 300
}, withMiddleware(
  corsMiddleware,
  authMiddleware,
  async (req, res) => {
    const students = req.body.students;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: "No students provided" });
      return;
    }

    const queue = getFunctions().taskQueue("processEnrollmentTask");

    const results = await Promise.all(
      students.map(async (student) => {
        try {
          await queue.enqueue(student);
          return { email: student.email, success: true };
        } catch (err: any) {
          functions.logger.info(`❌ Failed to enqueue ${student.email}:`, err.message);
          return { email: student.email, success: false };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.status(200).json({
      message: `✅ Queued ${successCount} students successfully, ❌ ${failCount} failed.`,
    });
  }
));
