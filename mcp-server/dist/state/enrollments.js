import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
const STATE_PATH = resolve(import.meta.dirname, "../../state/enrollments.json");
function toISOString(ts) {
    if (!ts)
        return "";
    if (ts.toDate)
        return ts.toDate().toISOString();
    if (ts._seconds)
        return new Date(ts._seconds * 1000).toISOString();
    return String(ts);
}
export async function generateEnrollmentsState() {
    const snapshot = await db.collection(COLLECTION.ENROLLMENTS).get();
    const enrollments = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            userId: d.userId ?? "",
            userName: d.userName ?? "",
            userEmail: d.userEmail ?? "",
            courseId: d.courseId ?? "",
            courseName: d.courseName ?? "",
            bundleId: d.bundleId,
            status: d.status ?? "",
            orderId: d.orderId ?? "",
            enrollmentDate: toISOString(d.enrollmentDate),
            completionDate: d.completionDate ? toISOString(d.completionDate) : null,
            hasCertificate: d.certification?.issued ?? false,
            createdAt: toISOString(d.createdAt),
            updatedAt: toISOString(d.updatedAt),
        };
    });
    const byStatus = {};
    const byCourse = {};
    for (const e of enrollments) {
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
        byCourse[e.courseId] = (byCourse[e.courseId] ?? 0) + 1;
    }
    const state = {
        enrollments,
        totalCount: enrollments.length,
        byStatus,
        byCourse,
        generatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    return state;
}
//# sourceMappingURL=enrollments.js.map