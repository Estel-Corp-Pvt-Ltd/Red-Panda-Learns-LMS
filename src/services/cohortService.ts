import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  runTransaction,
  WhereFilterOp,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { Cohort } from '@/types/course';
import type { Enrollment } from '@/types/course';
class CohortService {
  
  private async generateCohortId(): Promise<string> {
    const counterRef = doc(db, 'counters', 'cohortCounter');

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (40 - 10 + 1)) + 10; // 10–40 gap
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 60000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `cohort_${newId}`;
  }


  
  // FIX: This now accepts and saves the full topics array.
  async createCohort(
    data: Omit<Cohort, 'id' | 'createdAt' | 'updatedAt' | 'cohortEnrollments'>
  ): Promise<string> {
    try {
      const cohortId = await this.generateCohortId();

      const cohort: Cohort = {
        id: cohortId,
        title: data.title,
        description: data.description || '',
        price : data.price,
        topics: data.topics, // <-- SAVING THE FULL TOPICS ARRAY
        startDate: data.startDate,
        endDate: data.endDate,
        enrollmentOpen: data.enrollmentOpen,
        maxStudents: data.maxStudents ?? null,
        requireEnrollment: data.requireEnrollment ?? false,
        requireCohortAccess: data.requireCohortAccess ?? false,
        cohortEnrollments: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'Cohorts', cohortId), cohort);
      console.log('CohortService - Cohort created with full curriculum:', cohortId);
      return cohortId;

    } catch (error) {
      console.error('CohortService - Error creating cohort:', error);
      throw new Error('Failed to create cohort');
    }
  }

  // FIX: This now accepts and updates the full topics array.
  async updateCohort(
    cohortId: string,
    data: Partial<Omit<Cohort, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const cohortRef = doc(db, 'Cohorts', cohortId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      await updateDoc(cohortRef, updateData);
      console.log('CohortService - Cohort updated with full curriculum:', cohortId);
    } catch (error) {
      console.error(`CohortService - Error updating cohort ${cohortId}:`, error);
      throw new Error('Failed to update cohort');
    }
  }

  async getCohortById(cohortId: string): Promise<Cohort | null> {
      try {
        const cohortDoc = await getDoc(doc(db, 'Cohorts', cohortId));
        if (!cohortDoc.exists()) return null;

        const data = cohortDoc.data();
        // Safe date conversion
        const cohort = {
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
          endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        } as Cohort;
        return cohort;
      } catch (error) {
        console.error('CohortService - Error fetching cohort:', error);
        return null;
      }
  }

  async publishCohort(cohortId: string): Promise<void> {
    try {
      const cohortRef = doc(db, 'Cohorts', cohortId);
      await updateDoc(cohortRef, {
        enrollmentOpen: true,
        updatedAt: serverTimestamp(),
      });
      console.log('CohortService - Cohort published (enrollment open):', cohortId);
    } catch (error) {
      console.error('CohortService - Error publishing cohort:', error);
      throw error;
    }
  }

  async getAllCohorts(): Promise<Cohort[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'Cohorts'));

      const cohorts = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Cohort[];

      console.log('CohortService - Fetched cohorts:', cohorts.length);

      return cohorts;
    } catch (error) {
      console.error('CohortService - Error fetching cohorts:', error);
      return [];
    }
  }

  async getFilteredCohorts(
    filters?: { field: keyof Cohort; op: WhereFilterOp; value: any }[]
  ): Promise<Cohort[]> {
    try {
      const cohortsCollection = collection(db, 'Cohorts');

      if (filters && filters.length > 0) {
        const queryRef = query(
          cohortsCollection,
          ...filters.map(f => where(f.field as string, f.op, f.value))
        );

        const querySnapshot = await getDocs(queryRef);

        const cohorts = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Cohort[];

        console.log('CohortService - Fetched filtered cohorts:', cohorts.length);
        return cohorts;
      } else {
        // No filters: fetch all cohorts
        const querySnapshot = await getDocs(cohortsCollection);

        const cohorts = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Cohort[];

        console.log('CohortService - Fetched all cohorts:', cohorts.length);
        return cohorts;
      }
    } catch (error) {
      console.error('CohortService - Error fetching filtered cohorts:', error);
      return [];
    }
  }

  async deleteCohort(cohortId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'Cohorts', cohortId));
      console.log('CohortService - Cohort deleted successfully:', cohortId);
    } catch (error) {
      console.error('CohortService - Error deleting cohort:', error);
      throw new Error('Failed to delete cohort');
    }
  }



async getUserCohortEnrollments(userId: string): Promise<Enrollment[]> {
  try {
    const enrollmentsRef = collection(db, 'CohortEnrollments');
    const q = query(enrollmentsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const enrollments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrolledAt: doc.data().enrolledAt.toDate(),
    })) as Enrollment[];

    return enrollments;
  } catch (error) {
    console.error('CohortService - Error fetching user cohort enrollments:', error);
    return [];
  }
}




}

export const cohortService = new CohortService();
