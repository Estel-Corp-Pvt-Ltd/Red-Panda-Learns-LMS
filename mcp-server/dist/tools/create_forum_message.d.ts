import { z } from "zod";
export declare const createForumMessageSchema: {
    channelId: z.ZodString;
    courseId: z.ZodString;
    senderId: z.ZodString;
    senderName: z.ZodString;
    senderRole: z.ZodDefault<z.ZodOptional<z.ZodEnum<["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN"]>>>;
    text: z.ZodString;
    replyTo: z.ZodOptional<z.ZodString>;
};
export declare function createForumMessage(params: {
    channelId: string;
    courseId: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    text: string;
    replyTo?: string;
}): Promise<{
    messageId: string;
    channelId: string;
    senderName: string;
    status: string;
    isReply: boolean;
    message: string;
}>;
//# sourceMappingURL=create_forum_message.d.ts.map