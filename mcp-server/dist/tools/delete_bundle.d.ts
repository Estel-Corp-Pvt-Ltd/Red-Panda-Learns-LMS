import { z } from "zod";
export declare const deleteBundleSchema: {
    bundleId: z.ZodString;
};
export declare function deleteBundle(params: {
    bundleId: string;
}): Promise<{
    bundleId: string;
    title: any;
    message: string;
}>;
//# sourceMappingURL=delete_bundle.d.ts.map