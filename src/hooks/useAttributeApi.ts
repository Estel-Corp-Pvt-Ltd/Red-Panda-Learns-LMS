import { useQuery, useQueryClient } from '@tanstack/react-query';
import {  AttributeService } from '@/services/attributeService';
import { AttributeItem } from '@/types/attribute';
// Initialize the service
const attributeService = new AttributeService();

// Query Keys
export const attributeQueryKeys = {
  categories: ['attributes', 'categories'] as const,
  targetAudiences: ['attributes', 'targetAudiences'] as const,
};

// 🔍 Get all categories
export const useCategoriesQuery = () => {
  return useQuery<AttributeItem[]>({
    queryKey: attributeQueryKeys.categories,
    queryFn: () => attributeService.getItems('Category'),
    staleTime: 5 * 60 * 1000, // 5 mins
    retry: 2,
  });
};

// 🔍 Get all target audiences
export const useTargetAudiencesQuery = () => {
  return useQuery<AttributeItem[]>({
    queryKey: attributeQueryKeys.targetAudiences,
    queryFn: () => attributeService.getItems('TargetAudience'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

// Optional: Prefetch Helpers
export const useAttributePrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchCategories = () => {
    queryClient.prefetchQuery({
      queryKey: attributeQueryKeys.categories,
      queryFn: () => attributeService.getItems('Category'),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchTargetAudiences = () => {
    queryClient.prefetchQuery({
      queryKey: attributeQueryKeys.targetAudiences,
      queryFn: () => attributeService.getItems('TargetAudience'),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchCategories,
    prefetchTargetAudiences,
  };
};
