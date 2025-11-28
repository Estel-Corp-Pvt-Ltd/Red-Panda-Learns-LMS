import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';

class AdminAssignedStudentsService {
  async isStudentAssignedToAdmin(studentId: string) {
    const ref = collection(db, COLLECTION.ADMIN_ASSIGNED_STUDENTS);

    const q = query(
      ref,
      where('studentId', '==', studentId),
      where('active', '==', true)
    );

    const snap = await getDocs(q);

    return !snap.empty; // true if at least one matching document exists
  }
}

export const adminAssignedStudentsService = new AdminAssignedStudentsService();
