import * as admin from "firebase-admin";
import { AdminAssignedStudents } from "../types/admin-assigned-students";
import { COLLECTION } from "../constants";

const db = admin.firestore();
const assignStudentsRef = db.collection(COLLECTION.ADMIN_ASSIGNED_STUDENTS);

export const assignStudentsService = {
  async assignStudentsToAdmin(adminId: string, studentIds: string[], notificationEmail:string) {
    const batch = db.batch();
    const results: AdminAssignedStudents[] = [];

    for (const studentId of studentIds) {
      const customId = `${adminId}_${studentId}`;
      const docRef = assignStudentsRef.doc(customId);

      const payload: AdminAssignedStudents = {
        id: customId,
        adminId,
        studentId,
        notificationEmailAddress:notificationEmail,
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

async unassignStudentsFromAdmin(adminId: string, studentIds: string[]) {
  const batch = db.batch();  // Create a new batch instance

  for (const studentId of studentIds) {
    const docRef = assignStudentsRef.doc(`${adminId}_${studentId}`);  // Correctly getting the document reference
    batch.delete(docRef);  // Queue the delete operation for this document
  }

  try {
    await batch.commit();  // Commit the batch delete operation

  } catch (error) {
    console.error("Error unassigning students:", error);
  }
},

async pauseNotificationForSpecificStudents(adminId: string, studentIds: string[]) {
  const batch = db.batch();

  for (const studentId of studentIds) {
    const docId = `${adminId}_${studentId}`;
    const docRef = assignStudentsRef.doc(docId);

    // Use merge: true to avoid failures if doc doesn't exist
    batch.set(docRef, { active: false }, { merge: true });
  }

  try {
    await batch.commit();
   
  } catch (error) {
    console.error("Error pausing notifications for students:", error);
    throw error; // optional depending on how you handle errors
  }
},


};
