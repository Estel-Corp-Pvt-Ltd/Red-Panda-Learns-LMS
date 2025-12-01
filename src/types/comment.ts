import { FieldValue } from "firebase/firestore";
import { CommentType } from "./general";

export type Comment = {
  id: string;
  lessonId: string;
  courseId: string;
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


export type CommentVotes = {
  id: string;
  commentId: string;
  userId: string;
  lessonId: string;
  createdAt: FieldValue;
}
