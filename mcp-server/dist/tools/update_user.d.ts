import { z } from "zod";
export declare const updateUserSchema: {
    userId: z.ZodString;
    firstName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN", "ACCOUNTANT"]>>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "SUSPENDED"]>>;
    organizationId: z.ZodOptional<z.ZodString>;
};
export declare function updateUser(params: {
    userId: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    role?: string;
    status?: string;
    organizationId?: string;
}): Promise<{
    userId: string;
    email: any;
    firstName: any;
    lastName: any;
    role: any;
    status: any;
    message: string;
}>;
//# sourceMappingURL=update_user.d.ts.map