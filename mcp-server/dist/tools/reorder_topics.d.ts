import { z } from "zod";
export declare const reorderTopicsSchema: {
    courseId: z.ZodString;
    topicOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    itemOrders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
};
export declare function reorderTopics(params: {
    courseId: string;
    topicOrder?: string[];
    itemOrders?: Record<string, string[]>;
}): Promise<{
    courseId: string;
    courseTitle: any;
    topicsReordered: boolean;
    itemsReordered: string[];
    newTopicOrder: {
        id: any;
        title: any;
        itemCount: any;
    }[];
    message: string;
}>;
//# sourceMappingURL=reorder_topics.d.ts.map