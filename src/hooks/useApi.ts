import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi, topicsApi, lessonsApi } from '@/lib/api';

// Query keys for consistent caching
export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: number) => ['courses', id] as const,
  topics: (courseId: number) => ['topics', courseId] as const,
  topic: (id: number) => ['topic', id] as const,
  lessons: (topicId: number) => ['lessons', topicId] as const,
  lesson: (id: number) => ['lesson', id] as const,
  lessonsByCourse: (courseId: number) => ['lessons', 'course', courseId] as const,
};

// Custom hooks for API calls
export const useCoursesQuery = (params?: Parameters<typeof coursesApi.getCourses>[0]) => {
  return useQuery({
    queryKey: [...queryKeys.courses, params],
    queryFn: () => coursesApi.getCourses(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useCourseQuery = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useTopicsQuery = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.topics(courseId),
    queryFn: () => topicsApi.getTopicsByCourse(courseId),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useTopicQuery = (topicId: number) => {
  return useQuery({
    queryKey: queryKeys.topic(topicId),
    queryFn: () => topicsApi.getTopic(topicId),
    enabled: !!topicId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useLessonsQuery = (topicId: number) => {
  return useQuery({
    queryKey: queryKeys.lessons(topicId),
    queryFn: () => lessonsApi.getLessonsByTopic(topicId),
    enabled: !!topicId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const useLessonQuery = (lessonId: number) => {
  return useQuery({
    queryKey: queryKeys.lesson(lessonId),
    queryFn: () => lessonsApi.getLesson(lessonId),
    enabled: !!lessonId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

export const useLessonsByCourseQuery = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.lessonsByCourse(courseId),
    queryFn: () => lessonsApi.getLessonsByCourse(courseId),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Helper hook for prefetching related data
export const useApiPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchCourse = (courseId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.course(courseId),
      queryFn: () => coursesApi.getCourse(courseId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchTopics = (courseId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.topics(courseId),
      queryFn: () => topicsApi.getTopicsByCourse(courseId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchLessons = (topicId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.lessons(topicId),
      queryFn: () => lessonsApi.getLessonsByTopic(topicId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchCourse,
    prefetchTopics,
    prefetchLessons,
  };
};