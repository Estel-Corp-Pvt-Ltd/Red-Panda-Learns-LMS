import { bundleService } from '@/services/bundleService';

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export const useBundleQuery = (param: string) => {
  console.log("bundle", param)
  return useQuery({
    queryKey: bundleQueryKeys.bundle(param),
    queryFn: async () => {
      let data = await bundleService.getBundleByUrl(param);
      if (!data) {
        data = await bundleService.getBundleById(param);
      }
      console.log("the data from bundle api", data);
      // If still not found, handle gracefully
      if (!data) {
        console.warn("Course not found for param:", param);
        return null;
      }
      return data;
    },
    enabled: Boolean(param), // ✅ prevents empty param fetches
  });
};

export const useBundleCoursesQuery = (bundleId: string) => {
  // console.log("useourse", bundleId)
  return useQuery({
    queryKey: bundleQueryKeys.bundleCourses(bundleId),
    queryFn: () => bundleService.getBundleCourses(bundleId),
    enabled: !!bundleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};


export const useUpdateBundleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bundleId,
      updatedData,
    }: {
      bundleId: string;
      updatedData: Record<string, any>;
    }) => bundleService.updateBundleQuery(bundleId, updatedData),

    onSuccess: (_, { bundleId }) => {
      queryClient.invalidateQueries({ queryKey: bundleQueryKeys.bundles });
      queryClient.invalidateQueries({ queryKey: bundleQueryKeys.bundle(bundleId) });
      queryClient.invalidateQueries({ queryKey: bundleQueryKeys.bundleCourses(bundleId) });
    },

    onError: (error) => {
      console.error("❌ Error in mutation:", error);
    },
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