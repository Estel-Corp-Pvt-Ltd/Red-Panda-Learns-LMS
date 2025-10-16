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
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';
import { Assignment, Submission } from '@/types/assignment';

/**
 * Firestore-based service for managing Assignments.
 * Handles CRUD operations, filtering, and ID generation.
 */
class AssignmentService {
  /**
   * Generates a new assignment ID in the format `assignment_<number>`,
   * starting from 60000000, with a random gap between 5 and 20.
   */
  private async generateAssignmentId(): Promise<string> {
    const counterRef = doc(db, 'counters', 'assignmentCounter');

    const newId = await runTransaction(db, async (transaction) => {
      const gap = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
      const counterDoc = await transaction.get(counterRef);

      let lastNumber = 60000000;
      if (counterDoc.exists()) {
        lastNumber = counterDoc.data().lastNumber;
      }

      const nextNumber = lastNumber + gap;
      transaction.set(counterRef, { lastNumber: nextNumber }, { merge: true });

      return nextNumber;
    });

    return `assignment_${newId}`;
  }

  /**
   * Creates a new assignment in Firestore.
   *
   * @param data - Partial assignment fields; required fields: title, content, courseId.
   * @returns The generated assignment ID.
   */
  async createAssignment(data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const assignmentId = await this.generateAssignmentId();

      const assignment: Assignment = {
        id: assignmentId,
        title: data.title,
        content: data.content,
        attachments: data.attachments || [],
        duration: data.duration || 60,
        fileUploadLimit: data.fileUploadLimit || 5,
        maximumUploadSize: data.maximumUploadSize || 10,
        totalPoints: data.totalPoints || 100,
        minimumPassPoint: data.minimumPassPoint || 60,
        authorId: data.authorId || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId), assignment);
      console.log('AssignmentService - Assignment created successfully:', assignmentId);

      return assignmentId;
    } catch (error) {
      console.error('AssignmentService - Error creating assignment:', error);
      throw new Error('Failed to create assignment');
    }
  }

  /**
   * Updates an existing assignment in Firestore.
   *
   * @param assignmentId - The ID of the assignment to update.
   * @param updates - Partial update fields.
   */
  async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<void> {
    try {
      const assignmentRef = doc(db, COLLECTION.ASSIGNMENTS, assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);

      if (!assignmentDoc.exists()) {
        throw new Error('Assignment not found');
      }

      await updateDoc(assignmentRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('AssignmentService - Assignment updated successfully:', assignmentId);
    } catch (error) {
      console.error('AssignmentService - Error updating assignment:', error);
      throw new Error('Failed to update assignment');
    }
  }

  /**
   * Retrieves a specific assignment by ID.
   *
   * @param assignmentId - The assignment document ID.
   * @returns The assignment object or null.
   */
  async getAssignmentById(assignmentId: string): Promise<Assignment | null> {
    try {
      const assignmentDoc = await getDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId));
      if (!assignmentDoc.exists()) {
        console.log('AssignmentService - Assignment not found:', assignmentId);
        return null;
      }

      const data = assignmentDoc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Assignment;
    } catch (error) {
      console.error('AssignmentService - Error fetching assignment:', error);
      return null;
    }
  }

  /**
   * Fetches all assignments.
   *
   * @returns Array of all assignments.
   */
  async getAllAssignments(): Promise<Assignment[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION.ASSIGNMENTS));

      const assignments = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Assignment[];

      console.log('AssignmentService - Fetched assignments:', assignments.length);
      return assignments;
    } catch (error) {
      console.error('AssignmentService - Error fetching assignments:', error);
      return [];
    }
  }

  /**
   * Fetches assignments filtered by conditions.
   *
   * @param filters - Array of filters (field, op, value).
   */
  async getFilteredAssignments(
    filters?: { field: keyof Assignment; op: WhereFilterOp; value: any }[]
  ): Promise<Assignment[]> {
    try {
      let q = collection(db, COLLECTION.ASSIGNMENTS);

      if (filters && filters.length > 0) {
        const queryRef = query(q, ...filters.map((f) => where(f.field as string, f.op, f.value)));
        const querySnapshot = await getDocs(queryRef);

        const assignments = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Assignment[];

        console.log('AssignmentService - Fetched filtered assignments:', assignments.length);
        return assignments;
      } else {
        const querySnapshot = await getDocs(q);
        const assignments = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Assignment[];

        console.log('AssignmentService - Fetched all assignments:', assignments.length);
        return assignments;
      }
    } catch (error) {
      console.error('AssignmentService - Error fetching filtered assignments:', error);
      return [];
    }
  }

  /**
   * Deletes an assignment by ID.
   *
   * @param assignmentId - The ID of the assignment to delete.
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId));
      console.log('AssignmentService - Assignment deleted successfully:', assignmentId);
    } catch (error) {
      console.error('AssignmentService - Error deleting assignment:', error);
      throw new Error('Failed to delete assignment');
    }
  }

  /**
 * Submits an assignment for a student
 * 
 * @param submission - The submission data including assignmentId, studentId, and submissionFiles
 * @returns The generated submission ID
 */
  async createSubmission(submission: Omit<Submission, 'id' | 'submittedAt'>): Promise<string> {
    try {
      // Validate that the assignment exists
      const assignment = await this.getAssignmentById(submission.assignmentId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Check if student has already submitted
      const existingSubmission = await this.getSubmissionByStudentAndAssignment(
        submission.studentId,
        submission.assignmentId
      );

      if (existingSubmission) {
        throw new Error('Student has already submitted this assignment');
      }

      // Validate file upload limits
      if (submission.submissionFiles.length > assignment.fileUploadLimit) {
        throw new Error(`Exceeds maximum file upload limit of ${assignment.fileUploadLimit}`);
      }

      const submissionData: Submission = {
        ...submission,
        submittedAt: new Date().toISOString(),
      };

      const ref = collection(db, COLLECTION.SUBMISSIONS);
      const docRef = await addDoc(ref, {
        ...submissionData,
        createdAt: serverTimestamp(),
      });

      console.log('AssignmentService - Assignment submitted successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('AssignmentService - Error submitting assignment:', error);
      throw error instanceof Error ? error : new Error('Failed to submit assignment');
    }
  }

  /**
 * Updates an existing submission in Firestore.
 *
 * @param submissionId - The ID of the submission to update.
 * @param updates - Partial submission fields to update.
 */
  async updateSubmission(submissionId: string, updates: Partial<Omit<Submission, 'id' | 'assignmentId' | 'studentId' | 'submittedAt'>>): Promise<void> {
    try {
      console.log('AssignmentService - Updating submission:', submissionId, updates);

      const submissionRef = doc(db, COLLECTION.SUBMISSIONS, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        console.error('AssignmentService - Submission not found:', submissionId);
        throw new Error('Submission not found');
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      console.log('AssignmentService - Update data:', updateData);

      await updateDoc(submissionRef, updateData);

      console.log('AssignmentService - Submission updated successfully:', submissionId);
    } catch (error) {
      console.error('AssignmentService - Error updating submission:', error);
      // Log more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error instanceof Error ? error : new Error('Failed to update submission');
    }
  }

  /**
 * Deletes a submission from Firestore.
 *
 * @param submissionId - The ID of the submission to delete.
 */
  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      const submissionRef = doc(db, COLLECTION.SUBMISSIONS, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        throw new Error('Submission not found');
      }

      await deleteDoc(submissionRef);

      console.log('AssignmentService - Submission deleted successfully:', submissionId);
    } catch (error) {
      console.error('AssignmentService - Error deleting submission:', error);
      throw error instanceof Error ? error : new Error('Failed to delete submission');
    }
  }

  /**
   * Gets a submission by student ID and assignment ID
   * 
   * @param studentId - The student ID
   * @param assignmentId - The assignment ID
   * @returns The submission object or null if not found
   */
  async getSubmissionByStudentAndAssignment(studentId: string, assignmentId: string): Promise<Submission | null> {
    try {
      const q = query(
        collection(db, COLLECTION.SUBMISSIONS),
        where('studentId', '==', studentId),
        where('assignmentId', '==', assignmentId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // There should only be one submission per student per assignment
      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        studentName: data.studentName,
        submissionFiles: data.submissionFiles || [],
        submittedAt: data.submittedAt,
        createdAt: data.createdAt?.toDate(),
      } as Submission;
    } catch (error) {
      console.error('AssignmentService - Error fetching submission by student and assignment:', error);
      return null;
    }
  }

  /**
 * Gets a specific submission by its ID
 */
  async getSubmittedAssignmentById(submissionId: string): Promise<Submission | null> {
    try {
      const submissionDoc = await getDoc(doc(db, COLLECTION.SUBMISSIONS, submissionId));

      if (!submissionDoc.exists()) {
        console.log('AssignmentService - Submission not found:', submissionId);
        return null;
      }

      const data = submissionDoc.data();
      return {
        id: submissionDoc.id,
        assignmentId: data.assignmentId,
        studentId: data.studentId,
        studentName: data.studentName,
        submissionFiles: data.submissionFiles || [],
        submittedAt: data.submittedAt,
        marks: data.marks,
        feedback: data.feedback,
        gradedAt: data.gradedAt,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Submission;
    } catch (error) {
      console.error('AssignmentService - Error fetching submission:', error);
      return null;
    }
  }

  /**
   * Gets all submissions for a specific assignment
   */
  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, COLLECTION.SUBMISSIONS),
        where('assignmentId', '==', assignmentId)
      );

      const querySnapshot = await getDocs(q);

      const submissions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          assignmentId: data.assignmentId,
          studentId: data.studentId,
          studentName: data.studentName,
          submissionFiles: data.submissionFiles || [],
          submittedAt: data.submittedAt,
          marks: data.marks,
          feedback: data.feedback,
          gradedAt: data.gradedAt,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Submission;
      });

      console.log('AssignmentService - Fetched submissions for assignment:', submissions.length);
      return submissions;
    } catch (error) {
      console.error('AssignmentService - Error fetching submissions by assignment:', error);
      return [];
    }
  }

  /**
   * Gets all submissions by a specific student
   * 
   * @param studentId - The student ID
   * @returns Array of submissions by the student
   */
  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, COLLECTION.SUBMISSIONS),
        where('studentId', '==', studentId)
      );

      const querySnapshot = await getDocs(q);

      const submissions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          assignmentId: data.assignmentId,
          studentId: data.studentId,
          studentName: data.studentName,
          submissionFiles: data.submissionFiles || [],
          submittedAt: data.submittedAt,
          createdAt: data.createdAt?.toDate(),
        } as Submission;
      });

      console.log('AssignmentService - Fetched submissions by student:', submissions.length);
      return submissions;
    } catch (error) {
      console.error('AssignmentService - Error fetching submissions by student:', error);
      return [];
    }
  }
}

export const assignmentService = new AssignmentService();
