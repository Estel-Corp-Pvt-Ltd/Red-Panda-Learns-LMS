import { z } from "zod";
export declare const updateBannerSchema: {
    bannerId: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ctaTitle: z.ZodOptional<z.ZodString>;
    ctaLink: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    gradientColors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    courseIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
    showToAllUsers: z.ZodOptional<z.ZodBoolean>;
    showInLandingPage: z.ZodOptional<z.ZodBoolean>;
};
export declare function updateBanner(params: {
    bannerId: string;
    title?: string;
    description?: string;
    ctaTitle?: string;
    ctaLink?: string;
    imageUrl?: string;
    gradientColors?: string[];
    courseIds?: string[];
    status?: string;
    showToAllUsers?: boolean;
    showInLandingPage?: boolean;
}): Promise<{
    bannerId: string;
    updatedFields: string[];
    message: string;
}>;
//# sourceMappingURL=update_banner.d.ts.map