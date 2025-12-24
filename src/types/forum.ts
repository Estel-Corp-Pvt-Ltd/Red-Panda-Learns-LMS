import { FieldValue, Timestamp } from "firebase/firestore";
import { UserRole } from "./general";

export const MESSAGE_TYPE = {
  TEXT: "TEXT",
  LINK: "LINK",
  IMAGE: "IMAGE",
} as const;

export const MESSAGE_STATUS = {
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];
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

export interface MessageContent {
  text: string;
  url: string | null;
}

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  messageType: MessageType;
  content: MessageContent;
  isEdited: boolean;
  status: MessageStatus;
  upvoteCount: number;
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
