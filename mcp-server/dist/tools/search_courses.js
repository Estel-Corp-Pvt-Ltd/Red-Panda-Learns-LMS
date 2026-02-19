import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const searchCoursesSchema = {
    query: z.string().describe("Search query - matches against title, description, tags"),
    limit: z.number().optional().default(20).describe("Maximum number of results (default 20)"),
};
export async function searchCourses(params) {
    const q = params.query.toLowerCase();
    const limit = params.limit ?? 20;
    // Try title prefix match first
    const titleSnapshot = await db
        .collection(COLLECTION.COURSES)
        .where("title", ">=", params.query)
        .where("title", "<=", params.query + "\uf8ff")
        .limit(limit)
        .get();
    if (titleSnapshot.size > 0) {
        const courses = titleSnapshot.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                title: d.title,
                slug: d.slug,
                status: d.status,
                pricingModel: d.pricingModel,
                instructorName: d.instructorName,
                tags: d.tags ?? [],
            };
        });
        return { courses, count: courses.length, matchType: "title_prefix" };
    }
    // Fall back to in-memory search across title, description, tags
    const allSnapshot = await db.collection(COLLECTION.COURSES).limit(100).get();
    const courses = allSnapshot.docs
        .map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            title: d.title ?? "",
            slug: d.slug ?? "",
            description: d.description ?? "",
            status: d.status ?? "",
            pricingModel: d.pricingModel ?? "",
            instructorName: d.instructorName ?? "",
            tags: (d.tags ?? []),
        };
    })
        .filter((c) => c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)))
        .map(({ description: _, ...rest }) => rest)
        .slice(0, limit);
    return { courses, count: courses.length, matchType: "text_search" };
}
//# sourceMappingURL=search_courses.js.map