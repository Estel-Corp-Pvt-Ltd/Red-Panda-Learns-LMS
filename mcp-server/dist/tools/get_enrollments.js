import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getEnrollmentsSchema = {
    userId: z.string().optional().describe("Filter by user ID"),
    courseId: z.string().optional().describe("Filter by course ID"),
    status: z.string().optional().describe("Filter by status: ACTIVE, COMPLETED, DROPPED"),
    fromDate: z.string().optional().describe("Filter enrollments from this date (inclusive). ISO string e.g. 2026-02-13T00:00:00Z"),
    toDate: z.string().optional().describe("Filter enrollments up to this date (inclusive). ISO string e.g. 2026-02-18T23:59:59Z"),
    limit: z.number().optional().default(200).describe("Maximum number of results (default 200, max 500)"),
};
export async function getEnrollments(params) {
    const hasDateFilter = params.fromDate || params.toDate;
    // When combining equality + range filters, do range in Firestore and equality in-memory
    const memFilters = {};
    let query = db.collection(COLLECTION.ENROLLMENTS);
    if (hasDateFilter) {
        // Apply date range in Firestore, everything else in-memory
        if (params.userId)
            memFilters.userId = params.userId;
        if (params.courseId)
            memFilters.courseId = params.courseId;
        if (params.status)
            memFilters.status = params.status;
        if (params.fromDate)
            query = query.where("createdAt", ">=", new Date(params.fromDate));
        if (params.toDate)
            query = query.where("createdAt", "<=", new Date(params.toDate));
    }
    else {
        if (params.userId)
            query = query.where("userId", "==", params.userId);
        if (params.courseId)
            query = query.where("courseId", "==", params.courseId);
        if (params.status)
            query = query.where("status", "==", params.status);
    }
    const fetchLimit = Object.keys(memFilters).length > 0
        ? Math.min((params.limit ?? 200) * 3, 1500)
        : Math.min(params.limit ?? 200, 500);
    query = query.limit(fetchLimit);
    const snapshot = await query.get();
    let enrollments = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            userId: d.userId,
            userName: d.userName,
            userEmail: d.userEmail,
            courseId: d.courseId,
            courseName: d.courseName,
            status: d.status,
            orderId: d.orderId,
            enrollmentDate: d.enrollmentDate?.toDate?.()?.toISOString() ?? "",
            completionDate: d.completionDate?.toDate?.()?.toISOString() ?? null,
        };
    });
    // Apply in-memory filters
    if (memFilters.userId)
        enrollments = enrollments.filter((e) => e.userId === memFilters.userId);
    if (memFilters.courseId)
        enrollments = enrollments.filter((e) => e.courseId === memFilters.courseId);
    if (memFilters.status)
        enrollments = enrollments.filter((e) => e.status === memFilters.status);
    const finalLimit = Math.min(params.limit ?? 200, 500);
    enrollments = enrollments.slice(0, finalLimit);
    return { enrollments, count: enrollments.length };
}
//# sourceMappingURL=get_enrollments.js.map