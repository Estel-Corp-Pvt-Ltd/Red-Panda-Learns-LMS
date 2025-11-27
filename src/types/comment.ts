import { FieldValue } from "firebase/firestore";

export type Comment = {
  id: string;
  lessonId: string;
  parentCommentId: string | null;
  userId: string;
  userName: string;
  content: string;
  status: "PENDING" | "APPROVED" | "DELETED";
  upvoteCount: number;
  countReplies: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
