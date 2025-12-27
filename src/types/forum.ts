import { FieldValue, Timestamp } from "firebase/firestore";
import { UserRole } from "./general";

export const MESSAGE_STATUS = {
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export interface ForumChannel {
  id: string;
  name: string;
  description: string;
  order: number;
  courseId: string;
  createdBy: string;
  createdAt: Timestamp | FieldValue;
  isArchived: boolean;
  isModerated: boolean;
}

export interface MessageAttachment {
  url: string;
  type: "image" | "video" | "audio" | "document" | "other";
  name?: string;
  size?: number;
}

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachments: MessageAttachment[];
  isEdited: boolean;
  status: MessageStatus;
  upvoteCount: number;
  replyCount: number;
  replyTo?: string; // ID of the message being replied to
  courseId: string;
  channelId: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface ForumMessageUpvote {
  id: string;
  userId: string;
  messageId: string;
  courseId: string;
  channelId: string;
  createdAt: Timestamp | FieldValue;
}
