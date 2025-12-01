import { notificationService } from "../../services/notificationService";
import { onDocumentCreated } from "firebase-functions/firestore";
import { COLLECTION } from "../../constants";
export const sendInitialNotification = onDocumentCreated(
 `${COLLECTION.SUBMISSION_NOTIFICATIONS}/{id}`,
  async (event) => {
    try {
      const id = event.params.id;

      console.log("🟢 New notification created:", id);

      // Call your existing service to send the initial email
      await notificationService.sendInitialEmail(id,true);

      console.log("📧 Email sent successfully for:", id);
    } catch (err) {
      console.error("❌ Failed to send email:", err);
    }
  }
);
