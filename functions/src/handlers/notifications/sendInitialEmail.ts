import { notificationService } from "../../services/notificationService";
import { onDocumentCreated } from "firebase-functions/firestore";
import { COLLECTION } from "../../constants";
export const sendInitialNotification = onDocumentCreated(
  `${COLLECTION.SUBMISSION_NOTIFICATION}/{id}`,
  async (event) => {
    const id = event.params.id;
    console.log("🟢 New notification created:", id);

    try {
      const result = await notificationService.sendInitialEmail(id, true);

      if (result.success) {
        console.log("📧 Email sent successfully for:", id);
      } else {
        console.error(`❌ Failed to send email for ${id}:`, result.error);
      }
    } catch (err) {
      console.error("❌ Exception while sending email:", err);
    }
  }
);

