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

export const useCourseQuery = (param: string) => {
  return useQuery({
    queryKey: queryKeys.course(param),
    queryFn: async () => {
      let data = await courseService.getCourseBySlug(param);
      if (!data) {
        data = await courseService.getCourseById(param);
      }

      // If still not found, handle gracefully
      if (!data) {
        console.warn("Course not found for param:", param);
        return;
      }
      return data;
    },
    enabled: !!param,
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
