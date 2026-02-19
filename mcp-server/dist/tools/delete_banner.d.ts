import { z } from "zod";
export declare const deleteBannerSchema: {
    bannerId: z.ZodString;
};
export declare function deleteBanner(params: {
    bannerId: string;
}): Promise<{
    bannerId: string;
    title: any;
    message: string;
}>;
//# sourceMappingURL=delete_banner.d.ts.map