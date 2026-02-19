import { z } from "zod";
export declare const searchUsersSchema: {
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function searchUsers(params: {
    query: string;
    limit?: number;
}): Promise<{
    users: {
        id: string;
        email: any;
        firstName: any;
        lastName: any;
        role: any;
        status: any;
    }[];
    count: number;
    matchType: string;
}>;
//# sourceMappingURL=search_users.d.ts.map