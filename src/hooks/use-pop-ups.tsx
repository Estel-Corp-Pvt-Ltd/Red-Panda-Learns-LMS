import { popUpService } from "@/services/popupService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const queryKeys = {
    popUps: ["popUps"] as const,
    activePopUps: ["popUps", "active"] as const,
};

export const useActivePopUpsQuery = () => {
    return useQuery({
        queryKey: queryKeys.activePopUps,
        queryFn: popUpService.getActivePopUps,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
};

export const usePopUpsPrefetch = () => {
    const queryClient = useQueryClient();

    const prefetchActivePopUps = () => {
        queryClient.prefetchQuery({
            queryKey: queryKeys.activePopUps,
            queryFn: popUpService.getActivePopUps,
            staleTime: 5 * 60 * 1000,
        });
    };

    return { prefetchActivePopUps };
};
