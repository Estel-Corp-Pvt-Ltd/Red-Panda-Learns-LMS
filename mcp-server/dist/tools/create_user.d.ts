import { z } from "zod";
export declare const createUserSchema: {
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    middleName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["STUDENT", "TEACHER", "INSTRUCTOR", "ADMIN", "ACCOUNTANT"]>>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["ACTIVE", "INACTIVE", "SUSPENDED"]>>>;
    organizationId: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
};
export declare function createUser(params: {
    email: string;
    firstName: string;
    lastName?: string;
    middleName?: string;
    role?: string;
    status?: string;
    organizationId?: string;
    password?: string;
}): Promise<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    message: string;
}>;
//# sourceMappingURL=create_user.d.ts.map