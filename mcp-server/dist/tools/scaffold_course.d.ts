import { z } from "zod";
export declare const scaffoldCourseSchema: {
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    instructorName: z.ZodString;
    instructorId: z.ZodString;
    pricingModel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["FREE", "PAID"]>>>;
    regularPrice: z.ZodOptional<z.ZodNumber>;
    salePrice: z.ZodOptional<z.ZodNumber>;
    topics: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        lessons: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            type: z.ZodDefault<z.ZodOptional<z.ZodString>>;
            duration: z.ZodOptional<z.ZodObject<{
                hours: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
                minutes: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                hours: number;
                minutes: number;
            }, {
                hours?: number | undefined;
                minutes?: number | undefined;
            }>>;
            embedUrl: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            type: string;
            description?: string | undefined;
            duration?: {
                hours: number;
                minutes: number;
            } | undefined;
            embedUrl?: string | undefined;
        }, {
            title: string;
            description?: string | undefined;
            type?: string | undefined;
            duration?: {
                hours?: number | undefined;
                minutes?: number | undefined;
            } | undefined;
            embedUrl?: string | undefined;
        }>, "many">>>;
        assignments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            totalPoints: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            deadline: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            totalPoints: number;
            description?: string | undefined;
            deadline?: string | undefined;
        }, {
            title: string;
            description?: string | undefined;
            totalPoints?: number | undefined;
            deadline?: string | undefined;
        }>, "many">>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        lessons: {
            title: string;
            type: string;
            description?: string | undefined;
            duration?: {
                hours: number;
                minutes: number;
            } | undefined;
            embedUrl?: string | undefined;
        }[];
        assignments: {
            title: string;
            totalPoints: number;
            description?: string | undefined;
            deadline?: string | undefined;
        }[];
    }, {
        title: string;
        lessons?: {
            title: string;
            description?: string | undefined;
            type?: string | undefined;
            duration?: {
                hours?: number | undefined;
                minutes?: number | undefined;
            } | undefined;
            embedUrl?: string | undefined;
        }[] | undefined;
        assignments?: {
            title: string;
            description?: string | undefined;
            totalPoints?: number | undefined;
            deadline?: string | undefined;
        }[] | undefined;
    }>, "many">;
};
export declare function scaffoldCourse(params: {
    title: string;
    description?: string;
    instructorName: string;
    instructorId: string;
    pricingModel?: "FREE" | "PAID";
    regularPrice?: number;
    salePrice?: number;
    topics: Array<{
        title: string;
        lessons?: Array<{
            title: string;
            type?: string;
            duration?: {
                hours?: number;
                minutes?: number;
            };
            embedUrl?: string;
            description?: string;
        }>;
        assignments?: Array<{
            title: string;
            description?: string;
            totalPoints?: number;
            deadline?: string;
        }>;
    }>;
}): Promise<{
    summary: {
        totalTopics: number;
        totalLessons: number;
        totalAssignments: number;
    };
    message: string;
    courseId: string;
    courseSlug: string;
    topics: Array<{
        topicId: string;
        topicTitle: string;
        lessons: Array<{
            lessonId: string;
            title: string;
        }>;
        assignments: Array<{
            assignmentId: string;
            title: string;
        }>;
    }>;
}>;
//# sourceMappingURL=scaffold_course.d.ts.map