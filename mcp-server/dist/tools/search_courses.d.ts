import { z } from "zod";
export declare const searchCoursesSchema: {
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function searchCourses(params: {
    query: string;
    limit?: number;
}): Promise<{
    courses: {
        id: string;
        title: any;
        slug: any;
        status: any;
        pricingModel: any;
        instructorName: any;
        tags: any;
    }[];
    count: number;
    matchType: string;
}>;
//# sourceMappingURL=search_courses.d.ts.map