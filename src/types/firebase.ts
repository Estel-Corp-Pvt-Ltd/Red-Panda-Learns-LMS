// Extended types that support both Firebase and TutorLMS API formats
export interface ExtendedLesson {
  ID: number;
  id?: string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_status: string;
  post_author: {
    ID: number;
    display_name: string;
    user_email: string;
    user_nicename: string;
  };
  topic_id: number;
  course_id: number;
  lesson_order: number;
  lesson_duration: string;
  video: any[];
  has_video: boolean;
  permalink: string;
  is_preview: boolean;
  // Firebase fields
  title?: string;
  content?: string;
  topicId?: string;
}

export interface ExtendedSidebarItem {
  id: string | number;
  title: string;
  type: 'course' | 'topic' | 'lesson';
  parentId?: number;
  courseId?: string | number;
  topicId?: string | number;
  isActive?: boolean;
  isExpanded?: boolean;
  isCompleted?: boolean;
  duration?: string;
  lessons?: ExtendedSidebarItem[];
}