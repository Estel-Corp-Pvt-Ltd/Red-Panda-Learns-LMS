import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cohortsApi } from '@/lib/cohortapi';
import { Cohort } from '@/types/course';

// Query keys for caching and invalidation
export const queryKeys = {
  cohorts: ['cohorts'] as const,
  cohort: (id: string) => ['cohorts', id] as const,
  cohortsByCourse: (courseId: string) => ['cohorts', 'course', courseId] as const,
};

// Hook: fetch all cohorts (can be extended with params later)
export const useCohortsQuery = () => {
  return useQuery<Cohort[]>({
    queryKey: queryKeys.cohorts,
    queryFn: () => cohortsApi.getCohorts(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
  });
};

// Hook: fetch a single cohort by ID
export const useCohortQuery = (cohortId: string) => {
  return useQuery<Cohort>({
    queryKey: queryKeys.cohort(cohortId),
    queryFn: () => cohortsApi.getCohort(cohortId),
    enabled: !!cohortId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 2,
  });
};

// Hook: fetch cohorts filtered by courseId
export const useCohortsByCourseQuery = (courseId: string) => {
  return useQuery<Cohort[]>({
    queryKey: queryKeys.cohortsByCourse(courseId),
    queryFn: () => cohortsApi.getCohortsByCourse(courseId),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Prefetch helper hooks to preload data
export const useCohortsApiPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchCohort = (cohortId: string) => {
    queryClient.prefetchQuery<Cohort>({
      queryKey: queryKeys.cohort(cohortId),
      queryFn: () => cohortsApi.getCohort(cohortId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchCohortsByCourse = (courseId: string) => {
    queryClient.prefetchQuery<Cohort[]>({
      queryKey: queryKeys.cohortsByCourse(courseId),
      queryFn: () => cohortsApi.getCohortsByCourse(courseId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchCohort,
    prefetchCohortsByCourse,
  };
};
