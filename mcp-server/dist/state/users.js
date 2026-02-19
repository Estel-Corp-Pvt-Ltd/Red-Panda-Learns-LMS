import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
const STATE_PATH = resolve(import.meta.dirname, "../../state/users.json");
function toISOString(ts) {
    if (!ts)
        return "";
    if (ts.toDate)
        return ts.toDate().toISOString();
    if (ts._seconds)
        return new Date(ts._seconds * 1000).toISOString();
    return String(ts);
}
export async function generateUsersState() {
    const snapshot = await db.collection(COLLECTION.USERS).get();
    const users = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            email: d.email ?? "",
            firstName: d.firstName ?? "",
            lastName: d.lastName ?? "",
            role: d.role ?? "",
            status: d.status ?? "",
            organizationId: d.organizationId,
            class: d.class,
            division: d.division,
            photoURL: d.photoURL,
            createdAt: toISOString(d.createdAt),
            updatedAt: toISOString(d.updatedAt),
        };
    });
    const byRole = {};
    const byStatus = {};
    for (const u of users) {
        byRole[u.role] = (byRole[u.role] ?? 0) + 1;
        byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    }
    const state = {
        users,
        totalCount: users.length,
        byRole,
        byStatus,
        generatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    return state;
}
//# sourceMappingURL=users.js.map