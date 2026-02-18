import { z } from "zod";
export declare const publishCourseSchema: {
    courseId: z.ZodString;
};
export declare function publishCourse(params: {
    courseId: string;
}): Promise<{
    courseId: string;
    title: any;
    status: string;
    message: string;
    previousStatus?: undefined;
    topicCount?: undefined;
} | {
    courseId: string;
    title: any;
    previousStatus: any;
    status: string;
    topicCount: any;
    message: string;
}>;
//# sourceMappingURL=publish_course.d.ts.map