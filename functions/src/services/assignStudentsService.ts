import * as admin from "firebase-admin";
import { AdminAssignedStudents } from "../types/admin-assigned-students";
import { COLLECTION } from "../constants";

const db = admin.firestore();
const assignStudentsRef = db.collection(COLLECTION.ADMIN_ASSIGNED_STUDENTS);

export const assignStudentsService = {
  async assignStudentsToAdmin(adminId: string, studentIds: string[]) {
    const batch = db.batch();
    const results: AdminAssignedStudents[] = [];

    for (const studentId of studentIds) {
      const customId = `${adminId}_${studentId}`;
      const docRef = assignStudentsRef.doc(customId);

      const payload: AdminAssignedStudents = {
        id: customId,
        adminId,
        studentId,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        createdBy: adminId,
      };

      batch.set(docRef, payload);
      results.push(payload);
    }

    await batch.commit();
    return results;
  },
};
