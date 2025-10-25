import { cohortService } from '@/services/cohortService';
import { courseService } from '@/services/courseService';
import { useQuery } from '@tanstack/react-query';

/*
  staleTime is set to Infinity since this data changes infrequently.
  Even if updates occur, users don’t need to see transient or intermediate states.
*/

export const queryKeys = {
  courses: ['courses'] as const,
  course: (id: string) => ['courses', id] as const,
  cohorts: ['cohorts'] as const,
};

export const useCoursesQuery = () => {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: async () => {
      const courses = await courseService.getAllCourses();
      return courses;
    },
    staleTime: Infinity
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
    staleTime: Infinity
  });
};

export const useCohortsQuery = () => {
  return useQuery({
    queryKey: queryKeys.cohorts,
    queryFn: async () => {
      const cohorts = await cohortService.getAllCohorts();
      return cohorts;
    },
    staleTime: Infinity
  });
};
