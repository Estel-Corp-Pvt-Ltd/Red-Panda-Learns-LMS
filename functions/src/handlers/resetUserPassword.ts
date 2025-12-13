import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { USER_ROLE } from "../constants";

if (!admin.apps.length) admin.initializeApp();

const resetUserPasswordHandler = async (req: functions.https.CallableRequest) => {
    if (!req.auth || req.auth.token.role !== USER_ROLE.ADMIN) {
        return { success: false, message: "Only admins can reset passwords." };
    }

    const { email, newPassword } = req.data;

    if (!email) {
        return { success: false, message: "Please provide the user's email." };
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
    }

    try {
        const userRecord = await admin.auth().getUserByEmail(email);

        await admin.auth().updateUser(userRecord.uid, { password: newPassword });

        return {
            success: true,
            uid: userRecord.uid,
            message: `Password reset successfully for ${userRecord.email || userRecord.uid}.`,
        };
    } catch (error: any) {
        functions.logger.error("Password reset failed:", error);
        if (error.code === "auth/user-not-found") {
            return {
                success: false,
                message: "No user found with that email address.",
            };
        }

        return {
            success: false,
            message: "Password reset failed. Please try again later.",
        };
    }
};

export const resetUserPassword = functions.https.onCall({ cors: ["https://vizuara.ai", "http://localhost:8080", "https://vizuara-ai-labs-dev.web.app"] }, resetUserPasswordHandler);
