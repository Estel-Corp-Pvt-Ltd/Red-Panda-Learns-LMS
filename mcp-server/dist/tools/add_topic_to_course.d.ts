import { z } from "zod";
export declare const addTopicToCourseSchema: {
    courseId: z.ZodString;
    title: z.ZodString;
};
export declare function addTopicToCourse(params: {
    courseId: string;
    title: string;
}): Promise<{
    courseId: string;
    courseTitle: any;
    topicId: string;
    topicTitle: string;
    topicIndex: number;
    totalTopics: any;
    message: string;
}>;
//# sourceMappingURL=add_topic_to_course.d.ts.map