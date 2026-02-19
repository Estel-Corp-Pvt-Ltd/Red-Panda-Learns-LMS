import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
export const dropEnrollmentSchema = {
    userId: z.string().describe("The user ID of the enrolled student"),
    courseId: z.string().describe("The course ID to drop enrollment from"),
};
export async function dropEnrollment(params) {
    const enrollmentId = `${params.userId}_${params.courseId}`;
    const enrollmentRef = db.collection(COLLECTION.ENROLLMENTS).doc(enrollmentId);
    const enrollmentDoc = await enrollmentRef.get();
    if (!enrollmentDoc.exists) {
        throw new Error(`Enrollment not found for userId=${params.userId}, courseId=${params.courseId}`);
    }
    const enrollmentData = enrollmentDoc.data();
    if (enrollmentData.status === "DROPPED") {
        return {
            enrollmentId,
            userId: params.userId,
            courseId: params.courseId,
            previousStatus: "DROPPED",
            newStatus: "DROPPED",
            message: "Enrollment is already dropped",
        };
    }
    const previousStatus = enrollmentData.status;
    await enrollmentRef.update({
        status: "DROPPED",
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        enrollmentId,
        userId: params.userId,
        userName: enrollmentData.userName,
        userEmail: enrollmentData.userEmail,
        courseId: params.courseId,
        courseName: enrollmentData.courseName,
        previousStatus,
        newStatus: "DROPPED",
        message: `Enrollment dropped for ${enrollmentData.userName} from ${enrollmentData.courseName}`,
    };
}
//# sourceMappingURL=drop_enrollment.js.map