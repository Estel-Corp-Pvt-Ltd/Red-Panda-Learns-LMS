import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bundleService } from '@/services/bundleService';

// Query keys for consistent caching
export const bundleQueryKeys = {
  bundles: ['bundles'] as const,
  bundle: (id: string) => ['bundles', id] as const,
  publishedBundles: ['bundles', 'published'] as const,
  bundleCourses: (bundleId: string) => ['bundles', bundleId, 'courses'] as const,
  bundlePricing: (courseIds: string[]) => ['bundles', 'pricing', courseIds] as const,
};

// Custom hooks for bundle API calls
export const useBundlesQuery = () => {
  return useQuery({
    queryKey: bundleQueryKeys.bundles,
    queryFn: () => bundleService.getAllBundles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const usePublishedBundlesQuery = () => {
  return useQuery({
    queryKey: bundleQueryKeys.publishedBundles,
    queryFn: () => bundleService.getPublishedBundles(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useBundleQuery = (bundleId: string) => {
  console.log("bundle", bundleId)
  return useQuery({
    queryKey: bundleQueryKeys.bundle(bundleId),
    queryFn: () => bundleService.getBundleById(bundleId),
    enabled: !!bundleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useBundleCoursesQuery = (bundleId: string) => {
  console.log("useOurse", bundleId)
  return useQuery({
    queryKey: bundleQueryKeys.bundleCourses(bundleId),
    queryFn: () => bundleService.getBundleCourses(bundleId),
    enabled: !!bundleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};

export const useBundlePricingQuery = (courseIds: string[]) => {
  return useQuery({
    queryKey: bundleQueryKeys.bundlePricing(courseIds),
    queryFn: () => bundleService.calculateBundlePricing(courseIds),
    enabled: courseIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes (pricing changes frequently)
    retry: 1,
  });
};

// Helper hook for prefetching related data
export const useBundleApiPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchBundle = (bundleId: string) => {
    queryClient.prefetchQuery({
      queryKey: bundleQueryKeys.bundle(bundleId),
      queryFn: () => bundleService.getBundleById(bundleId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchBundleCourses = (bundleId: string) => {
    queryClient.prefetchQuery({
      queryKey: bundleQueryKeys.bundleCourses(bundleId),
      queryFn: () => bundleService.getBundleCourses(bundleId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchBundle,
    prefetchBundleCourses,
  };
};