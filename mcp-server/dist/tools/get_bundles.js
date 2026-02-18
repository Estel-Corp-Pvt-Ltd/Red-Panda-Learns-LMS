import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getBundlesSchema = {
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().describe("Filter by status"),
    pricingModel: z.enum(["FREE", "PAID"]).optional().describe("Filter by pricing model"),
    limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};
export async function getBundles(params) {
    let query = db.collection(COLLECTION.BUNDLES);
    if (params.status) {
        query = query.where("status", "==", params.status);
    }
    if (params.pricingModel) {
        query = query.where("pricingModel", "==", params.pricingModel);
    }
    query = query.limit(params.limit ?? 50);
    const snapshot = await query.get();
    const bundles = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title,
            slug: data.slug,
            description: data.description,
            courseCount: data.courses?.length ?? 0,
            courses: data.courses ?? [],
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            pricingModel: data.pricingModel,
            status: data.status,
            instructorName: data.instructorName,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        };
    });
    return { bundles, count: bundles.length };
}
//# sourceMappingURL=get_bundles.js.map