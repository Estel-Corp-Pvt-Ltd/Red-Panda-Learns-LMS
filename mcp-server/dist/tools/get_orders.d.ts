import { z } from "zod";
export declare const getOrdersSchema: {
    userId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
};
export declare function getOrders(params: {
    userId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
}): Promise<{
    orders: {
        orderId: any;
        userId: any;
        userName: any;
        userEmail: any;
        items: any;
        status: any;
        amount: any;
        currency: any;
        createdAt: any;
    }[];
    count: number;
}>;
//# sourceMappingURL=get_orders.d.ts.map