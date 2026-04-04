import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const generateComplaintId = functions.https.onCall(
  {
    cors: [
      "https://RedPanda Learns.ai",
      "http://localhost:8080",
      "https://RedPanda Learns-ai-labs-dev.web.app",
    ],
  },
  async (request) => {
    try {
      // ✅ Ensure user is authenticated
      if (!request.auth) {
        functions.logger.warn("Unauthenticated request to generateComplaintId");
        return {
          success: false,
          message: "Authentication required",
        };
      }

      const counterRef = db.collection("Counters").doc("complaintCounter");

      const nextNumber = await db.runTransaction(async (tx) => {
        const snap = await tx.get(counterRef);

        let lastNumber = 50000000;
        if (snap.exists) {
          lastNumber = snap.data()?.lastNumber ?? lastNumber;
        }

        const gap = Math.floor(Math.random() * (25 - 10 + 1)) + 10;
        const newNumber = lastNumber + gap;

        tx.set(counterRef, { lastNumber: newNumber }, { merge: true });

        return newNumber;
      });

      const complaintId = `CMP_${nextNumber}`;

      functions.logger.info("Complaint ID generated", {
        complaintId,
        uid: request.auth.uid,
      });

      return {
        success: true,
        message: complaintId,
      };
    } catch (error: any) {
      functions.logger.error("Failed to generate complaint ID", error);

      return {
        success: false,
        message: "Failed to generate complaint ID",
      };
    }
  }
);
