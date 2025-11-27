import {
  collection,
  deleteDoc,
  doc,
  endBefore,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  limit,
  limitToLast,
  orderBy,
  Query,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  WhereFilterOp,
} from "firebase/firestore";

import { COLLECTION, COMMENT_STATUS } from "@/constants";
import { db } from "@/firebaseConfig";
import { Comment } from "@/types/comment";
import { ok, Result, fail } from "@/utils/response";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";
import { logError } from "@/utils/logger";

class CommentService {

  /**
   * Creates a new comment in the Firestore `comments` collection.
   *
   * This method:
   * 1. Generates a unique comment ID using Firestore's auto-generated ID.
   * 2. Constructs a `Comment` object with all required fields populated.
   * 3. Persists the comment object to Firestore under the generated comment ID.
   * 4. If it's a reply, updates the parent comment's reply count.
   *
   * @param data - The comment data without auto-generated fields.
   * @returns A promise that resolves to the generated comment ID if creation is successful.
   * @throws An error if the comment could not be created in Firestore.
   */
  async createComment(
    data: Omit<
      Comment,
      | "id"
      | "status"
      | "upvoteCount"
      | "countReplies"
      | "createdAt"
      | "updatedAt"
    >
  ): Promise<Result<string>> {
    try {
      const commentRef = doc(collection(db, COLLECTION.COMMENTS)); // auto-gen ID
      const commentId = commentRef.id

      const comment: Partial<Comment> = {
        id: commentId,
        lessonId: data.lessonId,
        parentCommentId: data.parentCommentId || null,
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        status: COMMENT_STATUS.PENDING, // Default status
        upvoteCount: 0,
        countReplies: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await runTransaction(db, async (transaction) => {
        // Create the comment
        transaction.set(commentRef, comment);

        // If this is a reply, update the parent comment's reply count
        if (data.parentCommentId) {
          const parentRef = doc(db, COLLECTION.COMMENTS, data.parentCommentId);
          transaction.update(parentRef, {
            countReplies: increment(1),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return ok(commentId);
    } catch (error: any) {
      logError("CommentService.createComment", error);
      return fail("Failed to create comment", error.code || error.message);
    }
  }

  /**
   * Updates an existing comment document in the Firestore `comments` collection.
   *
   * This method applies partial updates to the comment identified by `commentId`.
   * Only the fields provided in the `updates` object will be modified, while all
   * other existing fields remain unchanged. The `updatedAt` timestamp is always
   * refreshed to the current time.
   *
   * @param commentId - The unique identifier of the comment to update.
   * @param updates - A partial `Comment` object containing the fields to be updated.
   * @returns A promise that resolves when the update is complete.
   */
  async updateComment(
    commentId: string,
    updates: Partial<Pick<Comment, "content" | "status">>
  ): Promise<Result<void>> {
    try {
      const commentRef = doc(db, COLLECTION.COMMENTS, commentId);
      const commentDoc = await getDoc(commentRef);

      if (!commentDoc.exists()) {
        return fail("Comment not found");
      }

      const updateData: Partial<Comment> = {
        updatedAt: serverTimestamp(),
      };

      // Only allow updating content and status for now
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.status !== undefined) updateData.status = updates.status;

      await updateDoc(commentRef, updateData);

      return ok(null);
    } catch (error: any) {
      logError("CommentService.updateComment", error);
      return fail("Failed to update comment", error.code || error.message);
    }
  }

  /**
   * Retrieves a specific comment by its ID from the Firestore `comments` collection.
   *
   * @param commentId - The unique identifier of the comment to retrieve.
   * @returns A promise that resolves to the `Comment` object if found, or error if not found.
   */
  async getCommentById(commentId: string): Promise<Result<Comment>> {
    try {
      const commentDoc = await getDoc(doc(db, COLLECTION.COMMENTS, commentId));

      if (!commentDoc.exists()) {
        return fail("Comment not found");
      }

      const data = commentDoc.data();
      const comment: Comment = {
        id: commentDoc.id,
        lessonId: data.lessonId,
        parentCommentId: data.parentCommentId,
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        status: data.status,
        upvoteCount: data.upvoteCount,
        countReplies: data.countReplies,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return ok(comment);
    } catch (error: any) {
      logError("CommentService.getCommentById", error);
      return fail("Failed to fetch comment", error.code || error.message);
    }
  }

  /**
   * Retrieves comments with pagination and filtering support.
   *
   * @param filters - Optional filters to apply to the query.
   * @param options - Pagination options including limit, order, and cursor.
   * @returns A promise that resolves to paginated comments result.
   */
  async getComments(
    filters?: {
      field: keyof Comment;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<Comment> = {}
  ): Promise<Result<PaginatedResult<Comment>>> {
    try {
      const {
        limit: itemsPerPage = 25,
        orderBy: orderByOption = { field: "createdAt", direction: "desc" },
        pageDirection = "next",
        cursor = null,
      } = options;

      let q: Query = collection(db, COLLECTION.COMMENTS);

      // Apply filters if provided
      if (filters && filters.length > 0) {
        const whereClauses = filters.map((f) =>
          where(f.field as string, f.op, f.value)
        );
        q = query(q, ...whereClauses);
      }

      const countQuery = query(q);
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;

      // Apply ordering
      const { field, direction } = orderByOption;

      // Handle pagination
      if (pageDirection === "previous" && cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          endBefore(cursor),
          limitToLast(itemsPerPage)
        );
      } else if (cursor) {
        q = query(
          q,
          orderBy(field as string, direction),
          startAfter(cursor),
          limit(itemsPerPage)
        );
      } else {
        q = query(q, orderBy(field as string, direction), limit(itemsPerPage));
      }

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs;

      if (pageDirection === "previous") {
        documents.reverse();
      }

      const comments = documents.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          lessonId: data.lessonId,
          parentCommentId: data.parentCommentId,
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          status: data.status,
          upvoteCount: data.upvoteCount,
          countReplies: data.countReplies,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Comment;
      });

      // Determine pagination metadata
      const hasNextPage = querySnapshot.docs.length === itemsPerPage;
      const hasPreviousPage = cursor !== null;

      // Get cursors for next and previous pages
      const nextCursor = hasNextPage
        ? querySnapshot.docs[querySnapshot.docs.length - 1]
        : null;
      const previousCursor = hasPreviousPage ? querySnapshot.docs[0] : null;

      return ok({
        data: comments,
        hasNextPage,
        hasPreviousPage,
        nextCursor,
        previousCursor,
        totalCount,
      });
    } catch (error: any) {
      logError("CommentService.getComments", error);
      return fail("Failed to fetch comments", error.code || error.message);
    }
  }

  /**
   * Retrieves comments for a specific lesson with pagination.
   *
   * @param lessonId - The lesson ID to filter comments by.
   * @param options - Pagination options.
   * @returns A promise that resolves to paginated comments for the lesson.
   */
  async getCommentsByLesson(
    lessonId: string,
    options: PaginationOptions<Comment> = {}
  ): Promise<Result<PaginatedResult<Comment>>> {
    const filters = [
      { field: "lessonId", op: "==", value: lessonId },
      { field: "status", op: "==", value: "APPROVED" },
    ];

    return this.getComments(filters, options);
  }

  /**
   * Retrieves replies to a specific comment within a lesson.
   *
   * @param parentCommentId - The parent comment ID.
   * @param options - Pagination options.
   * @returns A promise that resolves to paginated replies.
   */
  async getCommentReplies(
    parentCommentId: string,
    options: PaginationOptions<Comment> = {}
  ): Promise<Result<PaginatedResult<Comment>>> {
    const filters = [
      { field: "parentCommentId", op: "==", value: parentCommentId },
      { field: "status", op: "==", value: "APPROVED" },
    ];

    return this.getComments(filters, options);
  }

  /**
   * Retrieves comments by user ID.
   *
   * @param userId - The user ID to filter comments by.
   * @returns A promise that resolves to the user's comments.
   */
  async getCommentsByUser(userId: string): Promise<Result<Comment[]>> {
    try {
      const commentsQuery = query(
        collection(db, COLLECTION.COMMENTS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(commentsQuery);

      if (snapshot.empty) {
        return ok([]);
      }

      const comments: Comment[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          lessonId: data.lessonId,
          parentCommentId: data.parentCommentId,
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          status: data.status,
          upvoteCount: data.upvoteCount,
          countReplies: data.countReplies,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      return ok(comments);
    } catch (error: any) {
      logError("CommentService.getCommentsByUser", error);
      return fail("Failed to fetch user comments", error.code || error.message);
    }
  }

  /**
   * Retrieves comments by user ID for a specific lesson.
   *
   * @param userId - The user ID to filter comments by.
   * @param lessonId - The lesson ID to filter comments by.
   * @returns A promise that resolves to the user's comments for the lesson.
   */
  async getUserCommentsForLesson(
    userId: string,
    lessonId: string
  ): Promise<Result<Comment[]>> {
    try {
      const commentsQuery = query(
        collection(db, COLLECTION.COMMENTS),
        where("userId", "==", userId),
        where("lessonId", "==", lessonId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(commentsQuery);

      if (snapshot.empty) {
        return ok([]);
      }

      const comments: Comment[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          lessonId: data.lessonId,
          parentCommentId: data.parentCommentId,
          userId: data.userId,
          userName: data.userName,
          content: data.content,
          status: data.status,
          upvoteCount: data.upvoteCount,
          countReplies: data.countReplies,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      return ok(comments);
    } catch (error: any) {
      logError("CommentService.getUserCommentsForLesson", error);
      return fail("Failed to fetch user comments for lesson", error.code || error.message);
    }
  }

  /**
   * Upvotes a comment.
   *
   * @param commentId - The comment ID to upvote.
   * @returns A promise that resolves when the upvote is recorded.
   */
  async upvoteComment(commentId: string): Promise<Result<void>> {
    try {
      const commentRef = doc(db, COLLECTION.COMMENTS, commentId);

      await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);

        if (!commentDoc.exists()) {
          throw new Error("Comment not found");
        }

        transaction.update(commentRef, {
          upvoteCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      });

      return ok(null);
    } catch (error: any) {
      logError("CommentService.upvoteComment", error);
      return fail("Failed to upvote comment", error.code || error.message);
    }
  }

  /**
   * Approves a pending comment.
   *
   * @param commentId - The comment ID to approve.
   * @returns A promise that resolves when the comment is approved.
   */
  async approveComment(commentId: string): Promise<Result<void>> {
    try {
      const commentRef = doc(db, COLLECTION.COMMENTS, commentId);
      await updateDoc(commentRef, {
        status: "APPROVED",
        updatedAt: serverTimestamp(),
      });

      return ok(null);
    } catch (error: any) {
      logError("CommentService.approveComment", error);
      return fail("Failed to approve comment", error.code || error.message);
    }
  }

  /**
   * Soft deletes a comment by setting its status to DELETED.
   *
   * @param commentId - The comment ID to delete.
   * @returns A promise that resolves when the comment is deleted.
   */
  async deleteComment(commentId: string): Promise<Result<void>> {
    try {
      const commentRef = doc(db, COLLECTION.COMMENTS, commentId);

      await runTransaction(db, async (transaction) => {
        const commentDoc = await transaction.get(commentRef);

        if (!commentDoc.exists()) {
          throw new Error("Comment not found");
        }

        const comment = commentDoc.data();

        // Soft delete the comment
        transaction.update(commentRef, {
          status: "DELETED",
          updatedAt: serverTimestamp(),
        });

        // If this is a reply, decrement parent's reply count
        if (comment.parentCommentId) {
          const parentRef = doc(db, COLLECTION.COMMENTS, comment.parentCommentId);
          transaction.update(parentRef, {
            countReplies: increment(-1),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return ok(null);
    } catch (error: any) {
      logError("CommentService.deleteComment", error);
      return fail("Failed to delete comment", error.code || error.message);
    }
  }

  /**
   * Hard deletes a comment from Firestore (use with caution).
   *
   * @param commentId - The comment ID to permanently delete.
   * @returns A promise that resolves when the comment is permanently deleted.
   */
  async hardDeleteComment(commentId: string): Promise<Result<void>> {
    try {
      await deleteDoc(doc(db, COLLECTION.COMMENTS, commentId));
      return ok(null);
    } catch (error: any) {
      logError("CommentService.hardDeleteComment", error);
      return fail("Failed to delete comment", error.code || error.message);
    }
  }

  /**
   * Gets comment statistics for a user.
   *
   * @param userId - The user ID to get statistics for.
   * @returns A promise that resolves to comment statistics.
   */
  async getUserCommentStats(userId: string): Promise<Result<{
    totalComments: number;
    approvedComments: number;
    pendingComments: number;
    totalUpvotes: number;
  }>> {
    try {
      const commentsQuery = query(
        collection(db, COLLECTION.COMMENTS),
        where("userId", "==", userId)
      );

      const snapshot = await getDocs(commentsQuery);

      let totalUpvotes = 0;
      let approvedComments = 0;
      let pendingComments = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalUpvotes += data.upvoteCount || 0;

        if (data.status === "APPROVED") approvedComments++;
        if (data.status === "PENDING") pendingComments++;
      });

      const stats = {
        totalComments: snapshot.size,
        approvedComments,
        pendingComments,
        totalUpvotes,
      };

      return ok(stats);
    } catch (error: any) {
      logError("CommentService.getUserCommentStats", error);
      return fail("Failed to fetch comment stats", error.code || error.message);
    }
  }

  /**
   * Gets comment statistics for a specific lesson.
   *
   * @param lessonId - The lesson ID to get statistics for.
   * @returns A promise that resolves to lesson comment statistics.
   */
  async getLessonCommentStats(lessonId: string): Promise<Result<{
    totalComments: number;
    totalReplies: number;
    totalUpvotes: number;
  }>> {
    try {
      const commentsQuery = query(
        collection(db, COLLECTION.COMMENTS),
        where("lessonId", "==", lessonId),
        where("status", "==", "APPROVED")
      );

      const snapshot = await getDocs(commentsQuery);

      let totalUpvotes = 0;
      let totalReplies = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalUpvotes += data.upvoteCount || 0;

        if (data.parentCommentId) {
          totalReplies++;
        }
      });

      const stats = {
        totalComments: snapshot.size,
        totalReplies,
        totalUpvotes,
      };

      return ok(stats);
    } catch (error: any) {
      logError("CommentService.getLessonCommentStats", error);
      return fail("Failed to fetch lesson comment stats", error.code || error.message);
    }
  }
}

export const commentService = new CommentService();
