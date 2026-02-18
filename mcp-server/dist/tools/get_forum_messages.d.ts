import { z } from "zod";
export declare const getForumMessagesSchema: {
    channelId: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "HIDDEN", "DELETED"]>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getForumMessages(params: {
    channelId: string;
    status?: string;
    limit?: number;
}): Promise<{
    messages: {
        id: string;
        senderId: any;
        senderName: any;
        senderRole: any;
        text: any;
        status: any;
        upvoteCount: any;
        replyCount: any;
        replyTo: any;
        isEdited: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_forum_messages.d.ts.map