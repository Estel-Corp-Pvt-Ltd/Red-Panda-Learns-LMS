import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";
export const getSubmissionsSchema = {
    assignmentId: z.string().optional().describe("Filter by assignment ID"),
    studentId: z.string().optional().describe("Filter by student ID"),
    courseId: z.string().optional().describe("Filter by course ID"),
    ungradedOnly: z.boolean().optional().describe("If true, only return submissions where marks is null"),
    limit: z.number().optional().default(50).describe("Maximum number of results (default 50)"),
};
export async function getSubmissions(params) {
    let query = db.collection(COLLECTION.ASSIGNMENT_SUBMISSIONS);
    if (params.assignmentId) {
        query = query.where("assignmentId", "==", params.assignmentId);
    }
    if (params.studentId) {
        query = query.where("studentId", "==", params.studentId);
    }
    if (params.courseId) {
        query = query.where("courseId", "==", params.courseId);
    }
    if (params.ungradedOnly) {
        query = query.where("marks", "==", null);
    }
    const limit = params.limit ?? 50;
    const snap = await query.limit(limit).get();
    const submissions = snap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            assignmentId: d.assignmentId,
            assignmentTitle: d.assignmentTitle,
            courseId: d.courseId,
            studentId: d.studentId,
            studentName: d.studentName,
            studentEmail: d.studentEmail,
            marks: d.marks ?? null,
            feedback: d.feedback ?? null,
            submissionFiles: d.submissionFiles || [],
            textSubmissions: d.textSubmissions || [],
            links: d.links || [],
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? null,
        };
    });
    return {
        totalCount: submissions.length,
        limit,
        submissions,
    };
}
//# sourceMappingURL=get_submissions.js.map