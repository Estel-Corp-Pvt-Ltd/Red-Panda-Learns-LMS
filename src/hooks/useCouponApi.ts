import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coupon } from '@/types/coupon.';
import { couponsApi
    
 } from '@/lib/couponapi';
// Query Keys
export const couponQueryKeys = {
  coupons: ['coupons'] as const,
  couponById: (id: string) => ['coupon', id] as const,
  couponByCode: (code: string) => ['couponCode', code] as const,
};

// Hooks

// 🔍 Get all coupons
export const useCouponsQuery = () => {
  return useQuery({
    queryKey: couponQueryKeys.coupons,
    queryFn: () => couponsApi.getAllCoupons(),
    staleTime: 5 * 60 * 1000, // 5 mins
    retry: 2,
  });
};

// 🔍 Get coupon by ID
export const useCouponByIdQuery = (couponId: string) => {
  return useQuery<Coupon | null>({
    queryKey: couponQueryKeys.couponById(couponId),
    queryFn: () => couponsApi.getCouponById(couponId),
    enabled: !!couponId,
    staleTime: 10 * 60 * 1000, // 10 mins
    retry: 2,
  });
};

// 🔍 Get coupon by Code
export const useCouponByCodeQuery = (code: string) => {
  return useQuery<Coupon | null>({
    queryKey: couponQueryKeys.couponByCode(code),
    queryFn: () => couponsApi.getCouponByCode(code),
    enabled: !!code,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });
};

// Optional: Prefetch Helpers
export const useCouponPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchCouponById = (couponId: string) => {
    queryClient.prefetchQuery({
      queryKey: couponQueryKeys.couponById(couponId),
      queryFn: () => couponsApi.getCouponById(couponId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchCouponByCode = (code: string) => {
    queryClient.prefetchQuery({
      queryKey: couponQueryKeys.couponByCode(code),
      queryFn: () => couponsApi.getCouponByCode(code),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchCouponById,
    prefetchCouponByCode,
  };
};
