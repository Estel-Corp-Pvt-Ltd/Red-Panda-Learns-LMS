
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface AttachmentItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'document' | 'link';
  url: string;
  size?: number;
  uploadedAt?: Timestamp | FieldValue | Date;
}

export interface VideoRuntime {
  hours: string;
  minutes: string;
  seconds: string;
}

export interface VideoItem {
  duration_sec?: string;
  playtime?: string;
  poster?: string;
  runtime?: VideoRuntime;
  source: 'youtube' | 'vimeo' | 'external' | 'embedded';
  source_embedded?: string;
  source_external_url?: string;
  source_shortcode?: string;
  source_video_id?: string;
  source_vimeo?: string;
  source_youtube?: string;
}

export interface UnifiedLesson {
  // Firebase fields (existing)
  id?: string;
  title?: string;
  content?: string;
  topicId?: string;
  courseId?: string;
  order?: number;
  type?: 'video' | 'text' | 'quiz' | 'assignment';
  duration?: number;
  isPublished?: boolean;
  isPreview?: boolean;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  
  // TutorLMS fields (migrated data format)
  ID?: number;
  post_title?: string;
  post_content?: string;
  post_name?: string;
  topic_id?: number | string;
  course_id?: number;
  thumbnail?: boolean | string;
  attachments?: AttachmentItem[];
  video?: VideoItem[];
}

export interface LessonFormData {
  title: string;
  content: string;
  post_name: string;
  thumbnail: boolean;
  attachments: AttachmentItem[];
  video: VideoItem[];
  isPreview: boolean;
  isPublished: boolean;
}

export interface UnifiedTopic {
  // Firebase fields
  id?: string;
  title?: string;
  description?: string;
  courseId?: string;
  order?: number;
  isPublished?: boolean;
  estimatedDuration?: number;
  totalLessons?: number;
  createdAt?: Timestamp | FieldValue | Date;
  updatedAt?: Timestamp | FieldValue | Date;
  
  // TutorLMS fields
  ID?: number | string;
  post_title?: string;
  post_content?: string;
  post_name?: string;
  course_id?: number;
  topic_order?: number;
  lessons?: UnifiedLesson[];
}

export interface DataFormat {
  type: 'tutorLMS' | 'firebase';
}
