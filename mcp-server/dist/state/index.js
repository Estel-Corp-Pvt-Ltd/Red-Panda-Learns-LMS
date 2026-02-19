import { generateCoursesState } from "./courses.js";
import { generateUsersState } from "./users.js";
import { generateEnrollmentsState } from "./enrollments.js";
import { generateOrdersState } from "./orders.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
const STATE_PATH = resolve(import.meta.dirname, "../../state/system.json");
const startTime = Date.now();
export async function refreshAllState() {
    const start = Date.now();
    const [courses, users, enrollments, orders] = await Promise.all([
        generateCoursesState(),
        generateUsersState(),
        generateEnrollmentsState(),
        generateOrdersState(),
    ]);
    const now = new Date().toISOString();
    const collections = [
        { collection: "Courses", count: courses.totalCount, lastUpdated: now },
        { collection: "Users", count: users.totalCount, lastUpdated: now },
        { collection: "Enrollments", count: enrollments.totalCount, lastUpdated: now },
        { collection: "Orders", count: orders.totalCount, lastUpdated: now },
    ];
    const system = {
        lastFullRefresh: now,
        collections,
        serverVersion: "1.0.0",
        uptime: Math.floor((Date.now() - startTime) / 1000),
    };
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(system, null, 2));
    return {
        system,
        counts: {
            courses: courses.totalCount,
            users: users.totalCount,
            enrollments: enrollments.totalCount,
            orders: orders.totalCount,
        },
        durationMs: Date.now() - start,
    };
}
/**
 * Targeted state refreshers for use after write operations.
 * These run asynchronously and do not block the tool response.
 */
export async function refreshCoursesState() {
    try {
        await generateCoursesState();
    }
    catch (err) {
        console.error("Auto-refresh courses state failed:", err);
    }
}
export async function refreshEnrollmentsState() {
    try {
        await generateEnrollmentsState();
    }
    catch (err) {
        console.error("Auto-refresh enrollments state failed:", err);
    }
}
export async function refreshOrdersState() {
    try {
        await generateOrdersState();
    }
    catch (err) {
        console.error("Auto-refresh orders state failed:", err);
    }
}
export async function refreshUsersState() {
    try {
        await generateUsersState();
    }
    catch (err) {
        console.error("Auto-refresh users state failed:", err);
    }
}
//# sourceMappingURL=index.js.map