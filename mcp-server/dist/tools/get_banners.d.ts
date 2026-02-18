import { z } from "zod";
export declare const getBannersSchema: {
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getBanners(params: {
    status?: string;
    limit?: number;
}): Promise<{
    banners: {
        id: string;
        title: any;
        description: any;
        ctaTitle: any;
        ctaLink: any;
        imageUrl: any;
        gradientColors: any;
        courseIds: any;
        status: any;
        showToAllUsers: any;
        showInLandingPage: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_banners.d.ts.map