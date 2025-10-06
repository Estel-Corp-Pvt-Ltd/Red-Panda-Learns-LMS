import { Timestamp, FieldValue } from "firebase-admin/firestore";

export interface Topic {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  order: number;
  isPublished: boolean;
  estimatedDuration: number; // in minutes
  totalLessons: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  topicId: string;
  courseId: string;
  order: number;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  duration: number; // in minutes
  isPublished: boolean;
  isPreview: boolean;
  video?: {
    source: 'youtube' | 'vimeo' | 'upload' | 'external';
    url: string;
    duration: number;
    thumbnail?: string;
  };
  resources?: Array<{
    id: string;
    name: string;
    type: 'pdf' | 'link' | 'file';
    url: string;
    size?: number;
  }>;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}