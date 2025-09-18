export interface Author {
  ID: number;
  display_name: string;
  user_email: string;
  user_nicename: string;
}

export interface Course {
  ID: number | string;
  post_title: string;
  post_content: string;
  post_excerpt: string;
  post_status: string;
  post_author: Author;
  post_date: string;
  post_modified: string;
  permalink: string;
  course_duration: string;
  total_lessons: number;
  total_students: number;
  course_price: string;
  is_enrolled: boolean;
}
