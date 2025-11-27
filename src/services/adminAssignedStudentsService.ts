import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';

class AdminAssignedStudentsService {
  async isStudentAssignedToAdmin(adminId: string, studentId: string) {
    const docId = `${adminId}_${studentId}`;
    const ref = doc(db, COLLECTION.ADMIN_ASSIGNED_STUDENTS, docId);

    const snap = await getDoc(ref);

    if (!snap.exists()) return false;

    const data = snap.data();
    return data.active === true;
  }
}

export const adminAssignedStudentsService = new AdminAssignedStudentsService();
