import { FieldValue } from "firebase/firestore";
import { CommentType } from "./general";

export interface Comment {
  id: string;
  lessonId: string;
  courseId: string;
  lessonName: string;
  courseName: string;
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

export interface CommentVotes {
  id: string;
  commentId: string;
  userId: string;
  lessonId: string;
  createdAt: FieldValue;
}
