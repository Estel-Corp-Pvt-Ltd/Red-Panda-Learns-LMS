import { z } from "zod";
export declare const getForumChannelsSchema: {
    courseId: z.ZodString;
    includeArchived: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
};
export declare function getForumChannels(params: {
    courseId: string;
    includeArchived?: boolean;
}): Promise<{
    channels: {
        id: string;
        name: any;
        description: any;
        order: any;
        courseId: any;
        isArchived: any;
        isModerated: any;
        createdBy: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_forum_channels.d.ts.map