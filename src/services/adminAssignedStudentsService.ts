import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";

class AdminAssignedStudentsService {
  async isStudentAssignedToAdmin(studentId: string): Promise<boolean> {
    try {
      const ref = collection(db, COLLECTION.ADMIN_ASSIGNED_STUDENTS);

      const q = query(
        ref,
        where("studentId", "==", studentId),
        where("active", "==", true)
      );

      const snap = await getDocs(q);

      return !snap.empty; // true if at least one matching document exists
    } catch (error) {
      console.error(
        `Error checking if student ${studentId} is assigned:`,
        error
      );
      return false; 
    }
  }
}

export const adminAssignedStudentsService = new AdminAssignedStudentsService();
