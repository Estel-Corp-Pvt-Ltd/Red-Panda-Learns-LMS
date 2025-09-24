
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { courseService } from '@/services/courseService';
import { cohortService } from '@/services/cohortService';
import { collection, query, where, getDocs, doc, getDoc, or, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Query keys for consistent caching
export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  topics: (courseId: string) => ['topics', courseId] as const,
  topic: (id: string) => ['topic', id] as const,
  lessons: (topicId: string) => ['lessons', topicId] as const,
  lesson: (id: string) => ['lesson', id] as const,
  lessonsByCourse: (courseId: string) => ['lessons', 'course', courseId] as const,
  cohorts: ['cohorts'] as const,
  cohort: (id: string) => ['cohorts', id] as const,
};

// Helper function to normalize video data
const normalizeVideoData = (video: any): any[] => {
  if (!video) return [];
  if (Array.isArray(video)) {
    return video.filter(v => v && typeof v === 'object' && !Array.isArray(v));
  }
  if (typeof video === 'object') {
    return [video];
  }
  return [];
};

// Custom hooks for Firebase API calls
export const useCoursesQuery = () => {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: async () => {
      const courses = await courseService.getAllCourses();
      // Map Firebase data to TutorLMS API format
      return courses;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useCourseQuery = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: async () => {
      const course = await courseService.getCourseById(courseId);
      if (!course) return null;
      return course;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useTopicsQuery = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.topics(courseId),
    queryFn: async () => {
      console.log('useTopicsQuery - Fetching topics for course:', courseId);

      // Create query with dual field support and proper ordering
      const courseIdNum = parseInt(courseId);
      const isNumericId = !isNaN(courseIdNum);

      let q;
      if (isNumericId) {
        // Handle both numeric and string courseId
        q = query(
          collection(db, 'topics'),
          or(
            where('courseId', '==', courseId),
            where('courseId', '==', courseIdNum),
            where('course_id', '==', courseIdNum)
          ),

        );
      } else {
        // String courseId
        q = query(
          collection(db, 'topics'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const topics = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        console.log('useTopicsQuery - Topic data:', data);
        return {
          ID: Number(doc.id.replace(/\D/g, '') || '1'),
          id: doc.id,
          post_title: data.post_title || data.title,
          post_content: data.post_content,
          post_status: 'publish',
          course_id: data.courseId || data.course_id,
          topic_order: data.order || data.topic_order || 0,
          permalink: `/course/${courseId}/topic/${doc.id}`,
        };
      });

      console.log('useTopicsQuery - Topics fetched:', topics.length);
      return topics;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useTopicQuery = (topicId: string) => {
  return useQuery({
    queryKey: queryKeys.topic(topicId),
    queryFn: async () => {
      const docRef = doc(db, 'topics', topicId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Topic not found');
      return { ID: docSnap.id, id: docSnap.id, ...(docSnap.data() as any) };
    },
    enabled: !!topicId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useLessonsQuery = (topicId: string) => {
  return useQuery({
    queryKey: queryKeys.lessons(topicId),
    queryFn: async () => {
      console.log('useLessonsQuery - Fetching lessons for topic:', topicId);

      // Create query with dual field support and proper ordering
      const topicIdNum = parseInt(topicId);
      const isNumericId = !isNaN(topicIdNum);
      // const isNumericId = false;

      let q;
      if (isNumericId) {
        // Handle both numeric and string topicId
        q = query(
          collection(db, 'lessons'),
          or(
            where('topicId', '==', topicId),
            where('topicId', '==', topicIdNum),
            where('topic_id', '==', topicIdNum)
          ),

        );
      } else {
        // String topicId
        q = query(
          collection(db, 'lessons'),
          // where('topicId', '==', topicId),
          or(
            where('topicId', '==', topicId),
            where('topicId', '==', topicId),
            where('topic_id', '==', topicId)
          ),
          orderBy('order', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const lessons = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        console.log('useLessonsQuery - Lesson data:', data);

        return {
          ID: Number(doc.id.replace(/\D/g, '') || '1'),
          id: doc.id,
          post_title: data.post_title || data.title,
          post_content: data?.post_content,
          attachments: data?.attachments || [],
          post_excerpt: '',
          post_status: 'publish',
          post_author: {
            ID: 1,
            display_name: 'Admin',
            user_email: 'admin@example.com',
            user_nicename: 'admin'
          },
          topic_id: Number(topicId.replace(/\D/g, '') || '1'),
          course_id: Number((data.courseId || data.course_id)?.toString().replace(/\D/g, '') || '1'),
          lesson_order: data.order || data.lesson_order || 0,
          lesson_duration: '',
          video: normalizeVideoData(data.video),
          has_video: !!(data.video && (Array.isArray(data.video) ? data.video.length > 0 : true)),
          permalink: `/lesson/${doc.id}`,
          is_preview: data.is_preview || false,
        };
      });

      console.log('useLessonsQuery - Lessons fetched:', lessons.length);
      return lessons;
    },
    enabled: !!topicId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useLessonQuery = (lessonId: string) => {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: async () => {
      const docRef = doc(db, 'lessons', lessonId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Lesson not found');
      const data = docSnap.data() as any;
      return {
        ID: docSnap.id,
        id: docSnap.id,
        ...data,
        video: normalizeVideoData(data.video),
        attachments: data.attachments || []
      };
    },
    enabled: !!lessonId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

export const useLessonsByCourseQuery = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.lessonsByCourse(courseId),
    queryFn: async () => {
      console.log('useLessonsByCourseQuery - Fetching lessons for course:', courseId);

      // First get topics for the course with dual field support
      const courseIdNum = parseInt(courseId);
      const isNumericId = !isNaN(courseIdNum);

      let topicsQuery;
      if (isNumericId) {
        topicsQuery = query(
          collection(db, 'topics'),
          or(
            where('courseId', '==', courseId),
            where('courseId', '==', courseIdNum),
            where('course_id', '==', courseIdNum)
          ),
          orderBy('order', 'asc')
        );
      } else {
        topicsQuery = query(
          collection(db, 'topics'),
          where('courseId', '==', courseId),
          orderBy('order', 'asc')
        );
      }

      const topicsSnapshot = await getDocs(topicsQuery);
      const topicIds = topicsSnapshot.docs.map(doc => doc.id);

      // Then get lessons for all topics
      if (topicIds.length === 0) return [];

      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('topicId', 'in', topicIds),
        orderBy('order', 'asc')
      );
      const lessonsSnapshot = await getDocs(lessonsQuery);

      const lessons = lessonsSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          ID: doc.id,
          id: doc.id,
          topic_id: data.topicId || data.topic_id,
          post_title: data.post_title || data.title,
          post_content: data.post_content,
          video: normalizeVideoData(data.video),
          attachments: data.attachments || [],
          ...data,
        };
      });

      console.log('useLessonsByCourseQuery - Lessons fetched:', lessons.length);
      return lessons;
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Cohort hooks
export const useCohortsQuery = () => {
  return useQuery({
    queryKey: queryKeys.cohorts,
    queryFn: async () => {
      console.log('useCohortsQuery - Fetching active cohorts');
      const cohorts = await cohortService.getActiveCohorts();
      console.log('useCohortsQuery - Cohorts fetched:', cohorts.length);
      return cohorts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useCohortQuery = (cohortId: string) => {
  return useQuery({
    queryKey: queryKeys.cohort(cohortId),
    queryFn: async () => {
      console.log('useCohortQuery - Fetching cohort:', cohortId);
      const cohort = await cohortService.getCohortById(cohortId);
      console.log('useCohortQuery - Cohort fetched:', cohort);
      return cohort;
    },
    enabled: !!cohortId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

// Helper hook for prefetching related data
export const useApiPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchCourse = (courseId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.course(courseId),
      queryFn: () => courseService.getCourseById(courseId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchTopics = (courseId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.topics(courseId),
      queryFn: async () => {
        const courseIdNum = parseInt(courseId);
        const isNumericId = !isNaN(courseIdNum);

        let q;
        if (isNumericId) {
          q = query(
            collection(db, 'topics'),
            or(
              where('courseId', '==', courseId),
              where('courseId', '==', courseIdNum),
              where('course_id', '==', courseIdNum)
            ),
            orderBy('order', 'asc')
          );
        } else {
          q = query(
            collection(db, 'topics'),
            where('courseId', '==', courseId),
            orderBy('order', 'asc')
          );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          ID: doc.id,
          id: doc.id,
          ...(doc.data() as any),
        }));
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchLessons = (topicId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.lessons(topicId),
      queryFn: async () => {
        const topicIdNum = parseInt(topicId);
        const isNumericId = !isNaN(topicIdNum);

        let q;
        if (isNumericId) {
          q = query(
            collection(db, 'lessons'),
            or(
              where('topicId', '==', topicId),
              where('topicId', '==', topicIdNum),
              where('topic_id', '==', topicIdNum)
            ),
            orderBy('order', 'asc')
          );
        } else {
          q = query(
            collection(db, 'lessons'),
            where('topicId', '==', topicId),
            orderBy('order', 'asc')
          );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            ID: doc.id,
            id: doc.id,
            topic_id: data.topicId || data.topic_id,
            post_title: data.post_title || data.title,
            post_content: data.post_content,
            video: normalizeVideoData(data.video),
            attachments: data.attachments || [],
            ...data,
          };
        });
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchCohorts = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.cohorts,
      queryFn: () => cohortService.getActiveCohorts(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchCohort = (cohortId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.cohort(cohortId),
      queryFn: () => cohortService.getCohortById(cohortId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchCourse,
    prefetchTopics,
    prefetchLessons,
    prefetchCohorts,
    prefetchCohort,
  };
};
