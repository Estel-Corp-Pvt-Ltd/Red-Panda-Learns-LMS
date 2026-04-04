import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// API Functions
export const coursesApi = {
  // Get all courses
  getCourses: async (params?: {
    order?: 'asc' | 'desc';
    orderby?: 'ID' | 'title' | 'date';
    per_page?: number;
    page?: number;
  }) => {
    const q = query(collection(db, 'courses'), orderBy(params?.orderby || 'ID', params?.order || 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Get single course
  getCourse: async (courseId: number) => {
    const courseRef = doc(db, 'courses', courseId.toString());
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) throw new Error('Course not found');
    return { id: courseSnap.id, ...courseSnap.data() } ;
  },
};

export const topicsApi = {
  // Get topics for a course
  getTopicsByCourse: async (courseId: number) => {
    const q = query(collection(db, 'topics'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } ));
  },

  // Get single topic
  getTopic: async (topicId: number) => {
    const topicRef = doc(db, 'topics', topicId.toString());
    const topicSnap = await getDoc(topicRef);
    if (!topicSnap.exists()) throw new Error('Topic not found');
    return { id: topicSnap.id, ...topicSnap.data() } ;
  },
};

export const lessonsApi = {
  // Get lessons for a topic
  getLessonsByTopic: async (topicId: number) => {
    const q = query(collection(db, 'lessons'), where('topicId', '==', topicId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } ));
  },

  // Get lessons for a course
  getLessonsByCourse: async (courseId: number) => {
    const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } ));
  },

  // Get single lesson
  getLesson: async (lessonId: number) => {
    const lessonRef = doc(db, 'lessons', lessonId.toString());
    const lessonSnap = await getDoc(lessonRef);
    if (!lessonSnap.exists()) throw new Error('Lesson not found');
    return { id: lessonSnap.id, ...lessonSnap.data() } ;
  },
};

// Video helpers remain the same
export const videoHelpers = {
  getVideoEmbedUrl: (video: any): string | null => {
    if (video?.source_youtube) {
      const videoId = video.source_youtube.split('v=')[1] || video.source_youtube.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
      // return video?.source_youtube;
    }
    
    if (video?.source_vimeo) {
      const videoId = video.source_vimeo.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    if (video?.source_embedded) {
      return video.source_embedded;
    }
    
    if (video?.source_external_url) {
      return video.source_external_url;
    }
    
    return null;
  },

  getVideoType: (video: any) => {
    if (video?.source_youtube) return 'youtube';
    if (video?.source_vimeo) return 'vimeo';
    if (video?.source_embedded) return 'embedded';
    if (video?.source_external_url) return 'external';
    return null;
  },
};

// Hook-style exports remain the same
export const apiHooks = {
  coursesApi,
  topicsApi,
  lessonsApi,
  videoHelpers,
};
