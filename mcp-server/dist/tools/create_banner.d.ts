import { z } from "zod";
export declare const createBannerSchema: {
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    ctaTitle: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    ctaLink: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    imageUrl: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    gradientColors: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    courseIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>>;
    showToAllUsers: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    showInLandingPage: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    createdBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
};
export declare function createBanner(params: {
    title: string;
    description?: string;
    ctaTitle?: string;
    ctaLink?: string;
    imageUrl?: string;
    gradientColors?: string[];
    courseIds?: string[];
    status?: string;
    showToAllUsers?: boolean;
    showInLandingPage?: boolean;
    createdBy?: string;
}): Promise<{
    bannerId: string;
    title: string;
    status: string;
    message: string;
}>;
//# sourceMappingURL=create_banner.d.ts.map