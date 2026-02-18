import { z } from "zod";
export declare const getUsersSchema: {
    role: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getUsers(params: {
    role?: string;
    status?: string;
    email?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<{
    users: {
        id: string;
        email: any;
        firstName: any;
        lastName: any;
        role: any;
        status: any;
        organizationId: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_users.d.ts.map