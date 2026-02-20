import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { ATTACHMENT_TYPE, LEARNING_CONTENT, LESSON_TYPE, VIDEO_SOURCE } from "../constants";
import { Duration } from "./general";

export type Attachment = (typeof ATTACHMENT_TYPE)[keyof typeof ATTACHMENT_TYPE];
export type LessonType = (typeof LESSON_TYPE)[keyof typeof LESSON_TYPE];
export type LearningContentType = (typeof LEARNING_CONTENT)[keyof typeof LEARNING_CONTENT];
export type VideoSource = (typeof VIDEO_SOURCE)[keyof typeof VIDEO_SOURCE];

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  description: string;
  embedUrl: string;
  duration: Duration;
  karmaBoostExpiresAfter: Duration;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};

export type LessonAttachment = {
  id: string;
  lessonId: string;
  name: string;
  url: string;
  type: Attachment;
  size: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
};
