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
  addDoc,
  orderBy, // Add this
  limit,   // Add this
  startAt, // Add this for pagination if needed
  startAfter, // Add this for pagination if needed
  endAt,   // Add this for pagination if needed
  endBefore, // Add this for pagination if needed
  Query,
  limitToLast,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';
import { Assignment, AssignmentSubmission } from '@/types/assignment';
import { fail, ok, Result } from '@/utils/response';
import { logError } from '@/utils/logger';
import { PaginatedResult, PaginationOptions } from '@/utils/pagination';

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
    const counterRef = doc(db, COLLECTION.COUNTERS, 'assignmentCounter');

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
  async createAssignment(data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<string | null>> {
    try {
      const assignmentId = await this.generateAssignmentId();

      const assignment: Assignment = {
        id: assignmentId,
        title: data.title,
        content: data.content,
        courseId: data.courseId,
        attachments: data.attachments || [],
        deadline: data.deadline,
        fileUploadLimit: data.fileUploadLimit || 5,
        maximumUploadSize: data.maximumUploadSize || 10,
        totalPoints: data.totalPoints || 100,
        minimumPassPoint: data.minimumPassPoint || 30,
        authorId: data.authorId || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId), assignment);
      console.log('AssignmentService - Assignment created successfully:', assignmentId);

      return ok(assignmentId);
    } catch (error) {
      logError('AssignmentService - Error creating assignment:', error);
      return fail("Error creating assignment");
    }
  }

  /**
   * Updates an existing assignment in Firestore.
   *
   * @param assignmentId - The ID of the assignment to update.
   * @param updates - Partial update fields.
   */
  async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<Result<void>> {
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
      return ok(null)
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
  async getAssignmentById(assignmentId: string): Promise<Result<Assignment | null>> {
    try {
      const assignmentDoc = await getDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId));
      if (!assignmentDoc.exists()) {
        console.log('AssignmentService - Assignment not found:', assignmentId);
        return null;
      }

      const data = assignmentDoc.data();
      return ok({
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Assignment);
    } catch (error) {
      logError('AssignmentService - Error fetching assignment:', error);
      return fail("Error fetching assignment");
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
  async deleteAssignment(assignmentId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.ASSIGNMENTS, assignmentId));
      return ok(undefined);
    } catch (error) {
      console.error('AssignmentService - Error deleting assignment:', error);
      return fail(
        'Failed to delete assignment',
        error?.code,
        error?.stack
      );
    }
  }

  /**
 * Submits an assignment for a student
 * 
 * @param submission - The submission data including assignmentId, studentId, and submissionFiles
 * @returns The generated submission ID
 */
  async createSubmission(submission: Omit<AssignmentSubmission, 'id'>): Promise<Result<string>> {
    try {
      // Validate that the assignment exists
      const result = await this.getAssignmentById(submission.assignmentId);
      if (!result.success) {
        return fail('Assignment not found');
      }
      const assignment = result.data;

      // Check if student has already submitted
      const existingSubmission = await this.getSubmissionByStudentAndAssignment(
        submission.studentId,
        submission.assignmentId
      );

      if (existingSubmission.success) {
        return fail('Student has already submitted this assignment');
      }

      if (assignment.deadline && new Date() > assignment.deadline.toDate()) {
        return fail('Assignment deadline has passed');
      }

      // Validate file upload limits
      if (submission.submissionFiles.length > assignment.fileUploadLimit) {
        return fail(`Exceeds maximum file upload limit of ${assignment.fileUploadLimit}`);
      }

      const submissionData = {
        ...submission,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS);
      const docRef = await addDoc(ref, {
        ...submissionData,
        createdAt: serverTimestamp(),
      });

      console.log('AssignmentService - Assignment submitted successfully:', docRef.id);
      return ok(docRef.id);
    } catch (error) {
      console.error('AssignmentService - Error submitting assignment:', error);
      return fail('Failed to submit assignment');
    }
  }

  /**
 * Updates an existing submission in Firestore.
 *
 * @param submissionId - The ID of the submission to update.
 * @param updates - Partial submission fields to update.
 */
  async updateSubmission(submissionId: string, updates: Partial<Omit<AssignmentSubmission, 'id' | 'assignmentId' | 'studentId' | 'createdAt' | 'updatedAt'>>): Promise<Result<null>> {
    try {
      console.log('AssignmentService - Updating submission:', submissionId, updates);

      const submissionRef = doc(db, COLLECTION.ASSIGNMENT_SUBMISSIONS, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        logError('AssignmentService - Submission not found:', submissionId);
        return fail("Submission not found");
      }

      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(submissionRef, updateData);

      return ok(null);
    } catch (error) {
      logError('AssignmentService - Error updating submission:', error);
      return fail("Error updating submission");
    }
  }

  /**
 * Deletes a submission from Firestore.
 *
 * @param submissionId - The ID of the submission to delete.
 */
  async deleteSubmission(submissionId: string): Promise<Result<null>> {
    try {
      const submissionRef = doc(db, COLLECTION.ASSIGNMENT_SUBMISSIONS, submissionId);
      const submissionDoc = await getDoc(submissionRef);

      if (!submissionDoc.exists()) {
        return fail("Submission not found");
      }

      await deleteDoc(submissionRef);

      return ok(null);
    } catch (error) {
      console.error('AssignmentService - Error deleting submission:', error);
      return fail("Error deleting submission");
    }
  }

  /**
   * Gets a submission by student ID and assignment ID
   * 
   * @param studentId - The student ID
   * @param assignmentId - The assignment ID
   * @returns The submission object or null if not found
   */
  async getSubmissionByStudentAndAssignment(studentId: string, assignmentId: string): Promise<Result<AssignmentSubmission | null>> {
    try {
      const q = query(
        collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS),
        where('studentId', '==', studentId),
        where('assignmentId', '==', assignmentId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return fail("Submission not found");
      }

      // There should only be one submission per student per assignment
      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return ok({
        id: doc.id,
        assignmentId: data.assignmentId,
        courseId: data.courseId,
        studentId: data.studentId,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        submissionFiles: data.submissionFiles || [],
        textSubmissions: data.textSubmissions || [],
        feedback: data.feedback || null,
        marks: data.marks || null,
        links: data.links || [],
        updatedAt: data.updatedAt,
        createdAt: data.createdAt?.toDate(),
      });
    } catch (error) {
      logError('AssignmentService - Error fetching submission by student and assignment:', error);
      return fail("Error fetching submission");
    }
  }

  /**
 * Gets a specific submission by its ID
 */
  async getSubmittedAssignmentById(submissionId: string): Promise<Result<AssignmentSubmission | null>> {
    try {
      const submissionDoc = await getDoc(doc(db, COLLECTION.ASSIGNMENT_SUBMISSIONS, submissionId));

      if (!submissionDoc.exists()) {
        logError('AssignmentService - Submission not found:', submissionId);
        return fail("Submission not found");
      }

      const data = submissionDoc.data();
      return ok({
        id: submissionDoc.id,
        assignmentId: data.assignmentId,
        courseId: data.courseId,
        studentId: data.studentId,
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        submissionFiles: data.submissionFiles || [],
        textSubmissions: data.textSubmissions || [],
        links: data.links || [],
        updatedAt: data.updatedAt,
        marks: data.marks,
        feedback: data.feedback,
        createdAt: data.createdAt?.toDate(),
      });
    } catch (error) {
      logError('AssignmentService - Error fetching submission:', error);
      return fail("Error fetching submission");
    }
  }

  /**
   * Gets all submissions for a specific assignment
   */
  async getSubmissionsByAssignment(assignmentId: string): Promise<Result<AssignmentSubmission[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS),
        where('assignmentId', '==', assignmentId)
      );

      const querySnapshot = await getDocs(q);

      const submissions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          assignmentId: data.assignmentId,
          courseId: data.courseId,
          studentId: data.studentId,
          studentName: data.studentName,
          studentEmail: data.studentEmail,
          submissionFiles: data.submissionFiles || [],
          textSubmissions: data.textSubmissions || [],
          links: data.links || [],
          marks: data.marks,
          feedback: data.feedback,
          gradedAt: data.gradedAt,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }) as AssignmentSubmission[];

      return ok(submissions);
    } catch (error) {
      console.error('AssignmentService - Error fetching submissions by assignment:', error);
      return ok([]);
    }
  }

  /**
   * Gets all submissions by a specific student
   * 
   * @param studentId - The student ID
   * @returns Array of submissions by the student
   */
  async getSubmissionsByStudent(studentId: string): Promise<Result<AssignmentSubmission[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS),
        where('studentId', '==', studentId)
      );

      const querySnapshot = await getDocs(q);

      const submissions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          assignmentId: data.assignmentId,
          courseId: data.courseId,
          studentId: data.studentId,
          studentName: data.studentName,
          studentEmail: data.studentEmail,
          submissionFiles: data.submissionFiles || [],
          textSubmissions: data.textSubmissions || [],
          links: data.links || [],
          marks: data.marks,
          feedback: data.feedback,
          submittedAt: data.submittedAt,
          createdAt: data.createdAt?.toDate(),
        } as AssignmentSubmission;
      });

      console.log('AssignmentService - Fetched submissions by student:', submissions.length);
      return ok(submissions);
    } catch (error) {
      console.error('AssignmentService - Error fetching submissions by student:', error);
      return ok([]);
    }
  }
  /**
   * Gets submissions with customizable filters and pagination
   */
  async getSubmissions(
    filters?: {
      field: keyof AssignmentSubmission;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<AssignmentSubmission> = {}
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
        pageDirection = 'next',
        cursor = null
      } = options;

      let q: Query = collection(db, COLLECTION.ASSIGNMENT_SUBMISSIONS);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      // Get total count before pagination
      const totalSnapshot = await getDocs(q);
      const totalCount = totalSnapshot.size;
      // Apply ordering
      const { field, direction } = orderByOption;

      // For pagination, we need to handle different scenarios
      if (pageDirection === 'previous' && cursor) {
        // Previous page - use endBefore with limitToLast
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        // Next page - use startAfter
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        // First page - simple limit
        q = query(
          q,
          orderBy(field as string, direction),
          limit(itemsPerPage)
        );
      }

      const querySnapshot = await getDocs(q);

      // Get the documents for pagination cursors
      const documents = querySnapshot.docs;

      if (pageDirection === 'previous') {
        // For previous page, we need to reverse the order since we used limitToLast
        documents.reverse();
      }

      const submissions = documents.map(doc => {
        const data = doc.data() as AssignmentSubmission;
        return {
          id: doc.id,
          assignmentId: data.assignmentId,
          studentId: data.studentId,
          studentName: data.studentName,
          submissionFiles: data.submissionFiles || [],
          textSubmissions: data.textSubmissions || [],
          links: data.links || [],
          marks: data.marks,
          feedback: data.feedback,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as AssignmentSubmission;
      });

      // Determine pagination metadata
      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;

      // Get cursors for next and previous pages
      const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      console.log('AssignmentService - Fetched submissions with pagination:', {
        count: submissions.length,
        hasNextPage,
        hasPreviousPage,
        pageDirection
      });

      return ok({
        data: submissions,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount
      });
    } catch (error) {
      logError('AssignmentService - Error fetching submissions with pagination:', error);
      return fail("Error fetching submissions");
    }
  }

  /**
   * Gets the first page of submissions with simplified interface
   */
  async getFirstSubmissionsPage(
    filters?: {
      field: keyof AssignmentSubmission;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    return this.getSubmissions(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'next',
      cursor: null
    });
  }

  /**
   * Gets the next page of submissions
   */
  async getNextSubmissionsPage(
    currentCursor: DocumentSnapshot,
    filters?: {
      field: keyof AssignmentSubmission;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    return this.getSubmissions(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'next',
      cursor: currentCursor
    });
  }

  /**
   * Gets the previous page of submissions
   */
  async getPreviousSubmissionsPage(
    currentCursor: DocumentSnapshot,
    filters?: {
      field: keyof AssignmentSubmission;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    return this.getSubmissions(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'previous',
      cursor: currentCursor
    });
  }

  /**
   * Enhanced method to get submissions by assignment with pagination
   */
  async getSubmissionsByAssignmentWithPagination(
    assignmentId: string,
    options: PaginationOptions<AssignmentSubmission> = {}
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    return this.getSubmissions([
      { field: 'assignmentId', op: '==', value: assignmentId }
    ], options);
  }

  /**
   * Enhanced method to get submissions by student with pagination
   */
  async getSubmissionsByStudentWithPagination(
    studentId: string,
    options: PaginationOptions<AssignmentSubmission> = {}
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    console.log('AssignmentService - Fetching submissions by student with pagination:', studentId, options);
    return this.getSubmissions([
      { field: 'studentId', op: '==', value: studentId }
    ], options);
  }

  /**
   * Gets ungraded submissions with pagination
   */
  async getUngradedSubmissionsWithPagination(
    assignmentId?: string,
    options: PaginationOptions<AssignmentSubmission> = {}
  ): Promise<Result<PaginatedResult<AssignmentSubmission>>> {
    const filters: any[] = [
      { field: 'marks', op: '==', value: null }
    ];

    if (assignmentId) {
      filters.push({ field: 'assignmentId', op: '==', value: assignmentId });
    }

    return this.getSubmissions(filters, {
      ...options,
      orderBy: options.orderBy || { field: 'createdAt', direction: 'asc' }
    });
  }


  /**
 * Gets assignments with customizable filters and pagination
 */
  async getAssignments(
    filters?: {
      field: keyof Assignment;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Assignment> = {}
  ): Promise<Result<PaginatedResult<Assignment>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: 'createdAt', direction: 'desc' },
        pageDirection = 'next',
        cursor = null
      } = options;

      let q: Query = collection(db, COLLECTION.ASSIGNMENTS);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      // Get total count before pagination
      const totalSnapshot = await getDocs(q);
      const totalCount = totalSnapshot.size;

      // Apply ordering
      const { field, direction } = orderByOption;

      // For pagination, we need to handle different scenarios
      if (pageDirection === 'previous' && cursor) {
        // Previous page - use endBefore with limitToLast
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        // Next page - use startAfter
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        // First page - simple limit
        q = query(
          q,
          orderBy(field as string, direction),
          limit(itemsPerPage)
        );
      }

      const querySnapshot = await getDocs(q);

      // Get the documents for pagination cursors
      const documents = querySnapshot.docs;

      if (pageDirection === 'previous') {
        // For previous page, we need to reverse the order since we used limitToLast
        documents.reverse();
      }

      const assignments = documents.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          attachments: data.attachments || [],
          deadline: data.deadline,
          fileUploadLimit: data.fileUploadLimit,
          maximumUploadSize: data.maximumUploadSize,
          totalPoints: data.totalPoints,
          minimumPassPoint: data.minimumPassPoint,
          authorId: data.authorId,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Assignment;
      });

      // Determine pagination metadata
      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;

      // Get cursors for next and previous pages
      const nextCursor = hasNextPage ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      console.log('AssignmentService - Fetched assignments with pagination:', {
        count: assignments.length,
        hasNextPage,
        hasPreviousPage,
        pageDirection
      });

      return ok({
        data: assignments,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount
      });
    } catch (error) {
      logError('AssignmentService - Error fetching assignments with pagination:', error);
      return fail("Error fetching assignments");
    }
  }

  /**
   * Gets the first page of assignments with simplified interface
   */
  async getFirstAssignmentsPage(
    filters?: {
      field: keyof Assignment;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<Assignment>>> {
    return this.getAssignments(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'next',
      cursor: null
    });
  }

  /**
   * Gets the next page of assignments
   */
  async getNextAssignmentsPage(
    currentCursor: DocumentSnapshot,
    filters?: {
      field: keyof Assignment;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<Assignment>>> {
    return this.getAssignments(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'next',
      cursor: currentCursor
    });
  }

  /**
   * Gets the previous page of assignments
   */
  async getPreviousAssignmentsPage(
    currentCursor: DocumentSnapshot,
    filters?: {
      field: keyof Assignment;
      op: WhereFilterOp;
      value: any;
    }[],
    pageSize: number = 25
  ): Promise<Result<PaginatedResult<Assignment>>> {
    return this.getAssignments(filters, {
      limit: pageSize,
      orderBy: { field: 'createdAt', direction: 'desc' },
      pageDirection: 'previous',
      cursor: currentCursor
    });
  }

  /**
   * Gets assignments by author with pagination
   */
  async getAssignmentsByAuthorWithPagination(
    authorId: string,
    options: PaginationOptions<Assignment> = {}
  ): Promise<Result<PaginatedResult<Assignment>>> {
    return this.getAssignments([
      { field: 'authorId', op: '==', value: authorId }
    ], options);
  }


  /**
   * Updates the authorId for a specific assignment
   * 
   * @param assignmentId - The ID of the assignment to update
   * @param authorId - The new author ID to set
   */
  async updateAssignmentAuthor(assignmentId: string, authorId: string): Promise<Result<null>> {
    try {
      const assignmentRef = doc(db, COLLECTION.ASSIGNMENTS, assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);

      if (!assignmentDoc.exists()) {
        return fail("Assignment not found");
      }

      await updateDoc(assignmentRef, {
        authorId,
        updatedAt: serverTimestamp(),
      });

      console.log('AssignmentService - Updated authorId for assignment:', assignmentId);
      return ok(null);
    } catch (error) {
      logError('AssignmentService - Error updating assignment author:', error);
      return fail("Error updating assignment author");
    }
  }

  /**
   * Updates authorId for multiple assignments at once
   * 
   * @param assignmentIds - Array of assignment IDs to update
   * @param authorId - The new author ID to set
   */
  async bulkUpdateAssignmentAuthor(assignmentIds: string[], authorId: string): Promise<Result<{ success: number; failed: number }>> {
    try {
      let successCount = 0;
      let failedCount = 0;

      for (const assignmentId of assignmentIds) {
        const result = await this.updateAssignmentAuthor(assignmentId, authorId);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      console.log('AssignmentService - Bulk update completed:', { success: successCount, failed: failedCount });
      return ok({ success: successCount, failed: failedCount });
    } catch (error) {
      logError('AssignmentService - Error in bulk update:', error);
      return fail("Error in bulk update");
    }
  }

  /**
   * Updates authorId for all assignments that have null/empty authorId
   * 
   * @param authorId - The author ID to set for null assignments
   */
  async updateNullAuthorAssignments(authorId: string): Promise<Result<{ updated: number; total: number }>> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION.ASSIGNMENTS));

      let updatedCount = 0;
      const totalCount = querySnapshot.size;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();

        // Check if authorId is null, undefined, or empty string
        if (!data.authorId || data.authorId === '') {
          await updateDoc(doc(db, COLLECTION.ASSIGNMENTS, docSnapshot.id), {
            authorId,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
          console.log('AssignmentService - Updated assignment:', docSnapshot.id);
        }
      }

      console.log('AssignmentService - Updated null author assignments:', { updated: updatedCount, total: totalCount });
      return ok({ updated: updatedCount, total: totalCount });
    } catch (error) {
      logError('AssignmentService - Error updating null author assignments:', error);
      return fail("Error updating null author assignments");
    }
  }

}

export const assignmentService = new AssignmentService();
