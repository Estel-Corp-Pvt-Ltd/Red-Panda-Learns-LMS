import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bundleService } from '@/services/bundleService';
import { doc,updateDoc , setDoc , getDoc  , Timestamp} from 'firebase/firestore';

import { db } from '@/firebaseConfig';
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
  // console.log("useourse", bundleId)
  return useQuery({
    queryKey: bundleQueryKeys.bundleCourses(bundleId),
    queryFn: () => bundleService.getBundleCourses(bundleId),
    enabled: !!bundleId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};


/**
 * Updates or creates a bundle document in Firestore.
 *
 * @param bundleId - The ID of the bundle document to update.
 * @param updatedData - An object containing the fields to update.
 */
export const updateBundleQuery = async (
  bundleId: string,
  updatedData: Record<string, any>
): Promise<void> => {
  const bundleRef = doc(db, "Bundles", bundleId);


  try {
    const snap = await getDoc(bundleRef);


    if (snap.exists()) {
      await updateDoc(bundleRef, updatedData);
    } else {
      await setDoc(bundleRef, updatedData, { merge: true });
    }
  } catch (error) {
    console.error("❌ Error updating bundle:", error);
    throw error;
  }
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