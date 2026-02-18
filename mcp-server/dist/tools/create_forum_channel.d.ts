import { z } from "zod";
export declare const createForumChannelSchema: {
    courseId: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    order: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    isModerated: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    createdBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
};
export declare function createForumChannel(params: {
    courseId: string;
    name: string;
    description?: string;
    order?: number;
    isModerated?: boolean;
    createdBy?: string;
}): Promise<{
    channelId: string;
    name: string;
    courseId: string;
    isModerated: boolean;
    message: string;
}>;
//# sourceMappingURL=create_forum_channel.d.ts.map