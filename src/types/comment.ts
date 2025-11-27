import { FieldValue } from "firebase/firestore";
import { CommentType } from "./general";

export type Comment = {
  id: string;
  lessonId: string;
  parentCommentId: string | null;
  userId: string;
  userName: string;
  content: string;
  status: CommentType;
  upvoteCount: number;
  countReplies: number;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
