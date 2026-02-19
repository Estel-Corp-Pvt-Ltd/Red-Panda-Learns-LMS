import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getCoursesSchema = {
    status: z.string().optional().describe("Filter by status: DRAFT, PUBLISHED, ARCHIVED"),
    instructorId: z.string().optional().describe("Filter by instructor ID"),
    pricingModel: z.string().optional().describe("Filter by pricing model: FREE, PAID"),
    fromDate: z.string().optional().describe("Filter courses created from this date (inclusive). ISO string e.g. 2026-02-13T00:00:00Z"),
    toDate: z.string().optional().describe("Filter courses created up to this date (inclusive). ISO string e.g. 2026-02-18T23:59:59Z"),
    limit: z.number().optional().default(200).describe("Maximum number of results (default 200, max 500)"),
};
export async function getCourses(params) {
    const hasDateFilter = params.fromDate || params.toDate;
    const memFilters = {};
    let query = db.collection(COLLECTION.COURSES);
    if (hasDateFilter) {
        if (params.status)
            memFilters.status = params.status;
        if (params.instructorId)
            memFilters.instructorId = params.instructorId;
        if (params.pricingModel)
            memFilters.pricingModel = params.pricingModel;
        if (params.fromDate)
            query = query.where("createdAt", ">=", new Date(params.fromDate));
        if (params.toDate)
            query = query.where("createdAt", "<=", new Date(params.toDate));
    }
    else {
        if (params.status)
            query = query.where("status", "==", params.status);
        if (params.instructorId)
            query = query.where("instructorId", "==", params.instructorId);
        if (params.pricingModel)
            query = query.where("pricingModel", "==", params.pricingModel);
    }
    const fetchLimit = Object.keys(memFilters).length > 0
        ? Math.min((params.limit ?? 200) * 3, 1500)
        : Math.min(params.limit ?? 200, 500);
    query = query.limit(fetchLimit);
    const snapshot = await query.get();
    let courses = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            title: d.title,
            slug: d.slug,
            status: d.status,
            mode: d.mode,
            pricingModel: d.pricingModel,
            regularPrice: d.regularPrice,
            salePrice: d.salePrice,
            instructorId: d.instructorId,
            instructorName: d.instructorName,
            topicCount: d.topics?.length ?? 0,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? "",
        };
    });
    if (memFilters.status)
        courses = courses.filter((c) => c.status === memFilters.status);
    if (memFilters.instructorId)
        courses = courses.filter((c) => c.instructorId === memFilters.instructorId);
    if (memFilters.pricingModel)
        courses = courses.filter((c) => c.pricingModel === memFilters.pricingModel);
    const finalLimit = Math.min(params.limit ?? 200, 500);
    courses = courses.slice(0, finalLimit);
    return { courses, count: courses.length };
}
//# sourceMappingURL=get_courses.js.map