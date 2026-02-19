import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
function initFirebase() {
    if (getApps().length > 0) {
        return;
    }
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath && existsSync(credPath)) {
        const serviceAccount = JSON.parse(readFileSync(resolve(credPath), "utf-8"));
        initializeApp({ credential: cert(serviceAccount) });
    }
    else {
        // Falls back to Application Default Credentials (ADC)
        initializeApp();
    }
}
initFirebase();
export const db = getFirestore();
export const auth = getAuth();
//# sourceMappingURL=firebase.js.map