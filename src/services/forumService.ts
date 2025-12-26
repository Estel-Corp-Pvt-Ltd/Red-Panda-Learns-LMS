import { COLLECTION, USER_ROLE } from "@/constants";
import { db } from "@/firebaseConfig";
import { ForumChannel, ChannelMessage, ForumMessageUpvote, MessageStatus } from "@/types/forum";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  increment,
  Timestamp,
  onSnapshot,
  QueryConstraint,
  DocumentSnapshot,
  startAfter,
  QueryDocumentSnapshot,
  WhereFilterOp,
  getCountFromServer,
} from "firebase/firestore";
import { Result, ok, fail } from "@/utils/response";
import { UserRole } from "@/types/general";
import { PaginatedResult, PaginationOptions } from "@/utils/pagination";

// ==================== FORUM CHANNELS ====================

export const forumChannelService = {
  /**
   * Create a new forum channel
   */
  async createChannel(
    channelData: Omit<ForumChannel, "id" | "createdAt">
  ): Promise<Result<ForumChannel>> {
    try {
      const channelRef = doc(collection(db, COLLECTION.FORUM_CHANNELS));
      const newChannel: ForumChannel = {
        ...channelData,
        id: channelRef.id,
        createdAt: Timestamp.now(),
      };

      await setDoc(channelRef, newChannel);

      return ok(newChannel);
    } catch (error: any) {
      console.error("Error creating channel:", error);
      return fail(error.message);
    }
  },

  /**
   * Get all channels for a course
   */
  async getChannelsByCourse(courseId: string): Promise<Result<ForumChannel[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.FORUM_CHANNELS),
        where("courseId", "==", courseId),
        where("isArchived", "==", false),
        orderBy("order", "asc")
      );

      const snapshot = await getDocs(q);
      const channels = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ForumChannel[];

      return ok(channels);
    } catch (error: any) {
      console.error("Error getting channels:", error);
      return fail(error.message);
    }
  },

  /**
   * Get a single channel by ID
   */
  async getChannelById(channelId: string): Promise<Result<ForumChannel>> {
    try {
      const channelRef = doc(db, COLLECTION.FORUM_CHANNELS, channelId);
      const channelSnap = await getDoc(channelRef);

      if (!channelSnap.exists()) {
        return fail("Channel not found");
      }

      return ok({ ...channelSnap.data(), id: channelSnap.id } as ForumChannel);
    } catch (error: any) {
      console.error("Error getting channel:", error);
      return fail(error.message);
    }
  },

  /**
   * Update a channel
   */
  async updateChannel(
    channelId: string,
    updates: Partial<Omit<ForumChannel, "id" | "createdAt">>
  ): Promise<Result<void>> {
    try {
      const channelRef = doc(db, COLLECTION.FORUM_CHANNELS, channelId);
      await updateDoc(channelRef, updates);

      return ok(undefined);
    } catch (error: any) {
      console.error("Error updating channel:", error);
      return fail(error.message);
    }
  },

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<Result<void>> {
    return this.updateChannel(channelId, { isArchived: true });
  },

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string): Promise<Result<void>> {
    try {
      const channelRef = doc(db, COLLECTION.FORUM_CHANNELS, channelId);
      await deleteDoc(channelRef);

      return ok(undefined);
    } catch (error: any) {
      console.error("Error deleting channel:", error);
      return fail(error.message);
    }
  },

  /**
   * Real-time listener for channels
   */
  subscribeToChannels(
    courseId: string,
    callback: (channels: ForumChannel[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION.FORUM_CHANNELS),
      where("courseId", "==", courseId),
      where("isArchived", "==", false),
      orderBy("order", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const channels = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ForumChannel[];
      callback(channels);
    });
  },
};

// ==================== CHANNEL MESSAGES ====================

export const channelMessageService = {
  /**
   * Send a new message
   */
  async sendMessage(
    messageData: Omit<ChannelMessage, "id" | "createdAt" | "updatedAt" | "isEdited" | "upvoteCount" | "replyCount">,
    isChannelModerated: boolean = false
  ): Promise<Result<ChannelMessage>> {
    try {
      const messageRef = doc(collection(db, COLLECTION.CHANNEL_MESSAGES));

      // If channel is moderated, set message status to HIDDEN by default
      // unless sender is admin or instructor
      const shouldAutoHide = isChannelModerated &&
        messageData.senderRole !== USER_ROLE.ADMIN &&
        messageData.senderRole !== USER_ROLE.INSTRUCTOR;

      const newMessage: ChannelMessage = {
        ...messageData,
        id: messageRef.id,
        isEdited: false,
        upvoteCount: 0,
        replyCount: 0,
        replyTo: messageData.replyTo || null,
        status: shouldAutoHide ? "HIDDEN" : messageData.status,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(messageRef, newMessage);

      // If this is a reply, increment the reply count of the parent message
      if (messageData.replyTo) {
        const parentRef = doc(db, COLLECTION.CHANNEL_MESSAGES, messageData.replyTo);
        await updateDoc(parentRef, {
          replyCount: increment(1),
        });
      }

      return ok(newMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      return fail(error.message);
    }
  },

  /**
   * Get messages with filters and pagination
   */
  async getMessagesWithFilters(
    filters?: {
      field: keyof ChannelMessage;
      op: WhereFilterOp;
      value: any;
    }[],
    options: PaginationOptions<ChannelMessage> = {}
  ): Promise<Result<PaginatedResult<ChannelMessage>>> {
    try {
      const {
        limit: limitCount = 50,
        orderBy: orderByOption,
        cursor: startAfterDoc,
      } = options;

      // Build query constraints
      const constraints: QueryConstraint[] = [];

      // Add filters
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          constraints.push(where(filter.field as string, filter.op, filter.value));
        });
      }

      // Add ordering
      const orderByField = orderByOption?.field || "createdAt";
      const orderByDirection = orderByOption?.direction || "desc";
      constraints.push(orderBy(orderByField as string, orderByDirection));

      // Add limit
      constraints.push(limit(limitCount));

      // Add pagination cursor
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      // Execute query
      const q = query(collection(db, COLLECTION.CHANNEL_MESSAGES), ...constraints);
      const snapshot = await getDocs(q);

      const messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChannelMessage[];

      // Get total count
      const countQuery = query(
        collection(db, COLLECTION.CHANNEL_MESSAGES),
        ...constraints.filter((c) => {
          const str = c.toString();
          return !str.includes("limit") && !str.includes("startAfter");
        })
      );
      const countSnapshot = await getCountFromServer(countQuery);
      const totalCount = countSnapshot.data().count;

      return ok({
        data: messages,
        totalCount,
        hasNextPage: messages.length === limitCount,
        hasPreviousPage: false, // Not tracking previous pages for now
        nextCursor: snapshot.docs[snapshot.docs.length - 1] || null,
        previousCursor: null,
      });
    } catch (error: any) {
      console.error("Error getting messages with filters:", error);
      return fail(error.message);
    }
  },

  /**
   * Get messages for a channel with pagination
   */
  async getMessages(
    channelId: string,
    limitCount: number = 50,
    lastDoc?: DocumentSnapshot
  ): Promise<Result<{ messages: ChannelMessage[]; lastDoc: DocumentSnapshot | null }>> {
    try {
      const constraints: QueryConstraint[] = [
        where("channelId", "==", channelId),
        where("status", "==", "ACTIVE"),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      ];

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, COLLECTION.CHANNEL_MESSAGES), ...constraints);
      const snapshot = await getDocs(q);

      const messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChannelMessage[];

      return ok({
        messages,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      });
    } catch (error: any) {
      console.error("Error getting messages:", error);
      return fail(error.message);
    }
  },

  /**
   * Get a single message by ID
   */
  async getMessageById(messageId: string): Promise<Result<ChannelMessage>> {
    try {
      const messageRef = doc(db, COLLECTION.CHANNEL_MESSAGES, messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        return fail("Message not found");
      }

      return ok({ ...messageSnap.data(), id: messageSnap.id } as ChannelMessage);
    } catch (error: any) {
      console.error("Error getting message:", error);
      return fail(error.message);
    }
  },

  /**
   * Get replies for a message
   */
  async getReplies(
    messageId: string,
    userRole: UserRole,
    userId: string
  ): Promise<Result<ChannelMessage[]>> {
    try {
      const q = query(
        collection(db, COLLECTION.CHANNEL_MESSAGES),
        where("replyTo", "==", messageId),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);
      let replies = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChannelMessage[];

      // Filter based on user role
      if (userRole === USER_ROLE.STUDENT) {
        replies = replies.filter(
          (reply) =>
            reply.status === "ACTIVE" ||
            (reply.status === "HIDDEN" && reply.senderId === userId)
        );
      }

      return ok(replies);
    } catch (error: any) {
      console.error("Error getting replies:", error);
      return fail(error.message);
    }
  },

  /**
   * Subscribe to replies for a message
   */
  subscribeToReplies(
    messageId: string,
    userRole: UserRole,
    userId: string,
    onUpdate: (replies: ChannelMessage[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION.CHANNEL_MESSAGES),
      where("replyTo", "==", messageId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let replies = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChannelMessage[];

      // Filter based on user role
      if (userRole === USER_ROLE.STUDENT) {
        replies = replies.filter(
          (reply) =>
            reply.status === "ACTIVE" ||
            (reply.status === "HIDDEN" && reply.senderId === userId)
        );
      }

      onUpdate(replies);
    });

    return unsubscribe;
  },

  /**
   * Update a message (edit)
   */
  async updateMessage(
    messageId: string,
    newText: string
  ): Promise<Result<void>> {
    try {
      const messageRef = doc(db, COLLECTION.CHANNEL_MESSAGES, messageId);
      await updateDoc(messageRef, {
        text: newText,
        isEdited: true,
        updatedAt: Timestamp.now(),
      });

      return ok(undefined);
    } catch (error: any) {
      console.error("Error updating message:", error);
      return fail(error.message);
    }
  },

  /**
   * Change message status (hide/delete)
   */
  async changeMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<Result<void>> {
    try {
      const messageRef = doc(db, COLLECTION.CHANNEL_MESSAGES, messageId);
      await updateDoc(messageRef, {
        status,
        updatedAt: Timestamp.now(),
      });

      return ok(undefined);
    } catch (error: any) {
      console.error("Error changing message status:", error);
      return fail(error.message);
    }
  },

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<Result<void>> {
    return this.changeMessageStatus(messageId, "DELETED");
  },

  /**
   * Hide a message
   */
  async hideMessage(messageId: string): Promise<Result<void>> {
    return this.changeMessageStatus(messageId, "HIDDEN");
  },

  /**
   * Unhide a message
   */
  async unhideMessage(messageId: string): Promise<Result<void>> {
    return this.changeMessageStatus(messageId, "ACTIVE");
  },

  /**
   * Toggle message visibility (hide/unhide)
   */
  async toggleMessageVisibility(messageId: string, currentStatus: MessageStatus): Promise<Result<void>> {
    const newStatus = currentStatus === "HIDDEN" ? "ACTIVE" : "HIDDEN";
    return this.changeMessageStatus(messageId, newStatus);
  },

  /**
   * Real-time listener for messages in a channel
   */
  subscribeToMessages(
    userRole: UserRole,
    channelId: string,
    currentUserId: string,
    callback: (messages: ChannelMessage[]) => void,
    limitCount: number = 50
  ): () => void {
    // Admin and instructor can see all messages (including hidden)
    if (userRole === USER_ROLE.ADMIN || userRole === USER_ROLE.INSTRUCTOR) {
      const q = query(
        collection(db, COLLECTION.CHANNEL_MESSAGES),
        where("channelId", "==", channelId),
        orderBy("createdAt", "asc"),
        limit(limitCount)
      );

      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as ChannelMessage[];
        callback(messages);
      });
    }

    // Students see all messages but will filter on client side
    // (can't use compound where with status OR senderId in Firestore)
    const q = query(
      collection(db, COLLECTION.CHANNEL_MESSAGES),
      where("channelId", "==", channelId),
      orderBy("createdAt", "asc"),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ChannelMessage[];

      // Filter to show only ACTIVE messages or user's own messages
      const filteredMessages = messages.filter(
        (msg) => msg.status === "ACTIVE" || msg.senderId === currentUserId
      );

      callback(filteredMessages);
    });
  },
};

// ==================== MESSAGE UPVOTES ====================

export const messageUpvoteService = {
  /**
   * Toggle upvote on a message
   */
  async toggleUpvote(
    userId: string,
    messageId: string,
    courseId: string,
    channelId: string
  ): Promise<Result<{ isUpvoted: boolean }>> {
    try {
      const upvoteId = `${userId}_${messageId}`;
      const upvoteRef = doc(db, COLLECTION.FORUM_MESSAGE_UPVOTES, upvoteId);
      const upvoteSnap = await getDoc(upvoteRef);

      const messageRef = doc(db, COLLECTION.CHANNEL_MESSAGES, messageId);

      if (upvoteSnap.exists()) {
        // Remove upvote
        await deleteDoc(upvoteRef);
        await updateDoc(messageRef, {
          upvoteCount: increment(-1),
        });

        return ok({ isUpvoted: false });
      } else {
        // Add upvote
        const newUpvote: ForumMessageUpvote = {
          id: upvoteId,
          userId,
          messageId,
          courseId,
          channelId,
          createdAt: Timestamp.now(),
        };

        await setDoc(upvoteRef, newUpvote);
        await updateDoc(messageRef, {
          upvoteCount: increment(1),
        });

        return ok({ isUpvoted: true });
      }
    } catch (error: any) {
      console.error("Error toggling upvote:", error);
      return fail(error.message);
    }
  },

  /**
   * Check if user has upvoted a message
   */
  async hasUserUpvoted(userId: string, messageId: string): Promise<boolean> {
    try {
      const upvoteId = `${userId}_${messageId}`;
      const upvoteRef = doc(db, COLLECTION.FORUM_MESSAGE_UPVOTES, upvoteId);
      const upvoteSnap = await getDoc(upvoteRef);

      return upvoteSnap.exists();
    } catch (error) {
      console.error("Error checking upvote:", error);
      return false;
    }
  },

  /**
   * Get upvotes for multiple messages (batch check)
   */
  async getUserUpvotesForMessages(
    userId: string,
    messageIds: string[]
  ): Promise<Set<string>> {
    try {
      const upvotedIds = new Set<string>();

      // Check in batches of 10 (Firestore 'in' limit)
      for (let i = 0; i < messageIds.length; i += 10) {
        const batch = messageIds.slice(i, i + 10);
        const upvoteIds = batch.map((msgId) => `${userId}_${msgId}`);

        const promises = upvoteIds.map((id) =>
          getDoc(doc(db, COLLECTION.FORUM_MESSAGE_UPVOTES, id))
        );

        const results = await Promise.all(promises);
        results.forEach((snap, idx) => {
          if (snap.exists()) {
            upvotedIds.add(batch[idx]);
          }
        });
      }

      return upvotedIds;
    } catch (error) {
      console.error("Error getting user upvotes:", error);
      return new Set();
    }
  },
};
