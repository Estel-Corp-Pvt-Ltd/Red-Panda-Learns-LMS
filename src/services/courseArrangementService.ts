import { COLLECTION } from '@/constants';
import { db } from '@/firebaseConfig';
import { CourseArrangement, CoursePageHeading } from '@/types/courseArrangement';
import { fail, ok, Result } from '@/utils/response';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

class CourseArrangementService {
  /**
   * Generates a new course arrangement ID in the format `arrangement_<number>`
   */
  private async generateArrangementId(): Promise<string> {
    const counterRef = doc(db, "Counters", "courseArrangementCounter");

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (100 - 30 + 1)) + 30;

      const counterDoc = await transaction.get(counterRef);
      let lastNumber = 10000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });
      return nextNumber;
    });

    return `arrangement_${newId}`;
  }

  /**
   * Creates a new course arrangement in Firestore
   */
  async createCourseArrangement(
    data: CoursePageHeading[]
  ): Promise<Result<string>> {
    try {
      const arrangementId = await this.generateArrangementId();

      const arrangement: CourseArrangement = {
        id: arrangementId,
        headings: data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, COLLECTION.COURSE_ARRANGEMENTS, arrangementId), {
        ...arrangement,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("CourseArrangementService - Arrangement created:", arrangementId);
      return ok(arrangementId);
    } catch (error) {
      console.error("CourseArrangementService - Error creating arrangement:", error);
      return fail("Failed to create course arrangement");
    }
  }

  /**
   * Saves/updates a course arrangement in Firestore
   * Creates new if doesn't exist, updates if exists
   */
  async saveCourseArrangement(
    arrangementId: string,
    headings: CoursePageHeading[]
  ): Promise<Result<void>> {
    try {
      const arrangementRef = doc(db, COLLECTION.COURSE_ARRANGEMENTS, arrangementId);
      const arrangementDoc = await getDoc(arrangementRef);

      const arrangementData = {
        headings,
        updatedAt: serverTimestamp(),
      };

      if (arrangementDoc.exists()) {
        // Update existing
        await updateDoc(arrangementRef, arrangementData);
        console.log("CourseArrangementService - Arrangement updated:", arrangementId);
      } else {
        // Create new
        await setDoc(arrangementRef, {
          ...arrangementData,
          id: arrangementId,
          createdAt: serverTimestamp(),
        });
        console.log("CourseArrangementService - Arrangement created:", arrangementId);
      }

      return ok(null);
    } catch (error) {
      console.error("CourseArrangementService - Error saving arrangement:", error);
      return fail("Failed to save course arrangement");
    }
  }

  /**
   * Loads a course arrangement from Firestore by ID
   */
  async loadCourseArrangement(arrangementId: string): Promise<Result<CourseArrangement>> {
    try {
      const arrangementDoc = await getDoc(doc(db, COLLECTION.COURSE_ARRANGEMENTS, arrangementId));

      if (!arrangementDoc.exists()) {
        return fail("Course arrangement not found");
      }

      const data = arrangementDoc.data();
      const arrangement: CourseArrangement = {
        id: arrangementDoc.id,
        headings: data.headings || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };

      console.log("CourseArrangementService - Arrangement loaded:", arrangementId);
      return ok(arrangement);
    } catch (error) {
      console.error("CourseArrangementService - Error loading arrangement:", error);
      return fail("Failed to load course arrangement");
    }
  }

  /**
   * Deletes a course arrangement from Firestore
   */
  async deleteCourseArrangement(arrangementId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.COURSE_ARRANGEMENTS, arrangementId));
      console.log("CourseArrangementService - Arrangement deleted:", arrangementId);
      return ok(null);
    } catch (error) {
      console.error("CourseArrangementService - Error deleting arrangement:", error);
      return fail("Failed to delete course arrangement");
    }
  }

  /**
   * Gets all course arrangements (for admin/list views)
   */
  async getAllCourseArrangements(): Promise<Result<CourseArrangement[]>> {
    try {
      const q = query(collection(db, COLLECTION.COURSE_ARRANGEMENTS));
      const querySnapshot = await getDocs(q);

      const arrangements = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          headings: data.headings || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as CourseArrangement;
      });

      console.log("CourseArrangementService - Fetched all arrangements:", arrangements.length);
      return ok(arrangements);
    } catch (error) {
      console.error("CourseArrangementService - Error fetching arrangements:", error);
      return fail("Failed to fetch course arrangements");
    }
  }
}

export const courseArrangementService = new CourseArrangementService();
