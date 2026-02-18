import { z } from "zod";
export declare const deleteUserSchema: {
    userId: z.ZodString;
    deleteAuthAccount: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
};
export declare function deleteUser(params: {
    userId: string;
    deleteAuthAccount?: boolean;
}): Promise<{
    userId: string;
    email: any;
    name: string;
    authDeleted: boolean;
    message: string;
}>;
//# sourceMappingURL=delete_user.d.ts.map