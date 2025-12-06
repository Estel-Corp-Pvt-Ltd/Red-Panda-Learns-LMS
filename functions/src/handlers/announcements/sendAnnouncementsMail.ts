import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { COLLECTION } from "../../constants";
import { sendAnnouncementEmailonDocCreation } from "./sendAnnouncementMailonDocumentCreation";
export const sendAnnouncementEmailNotification = onDocumentCreated(
  `${COLLECTION.ANNOUNCEMENTS}/{id}`,
  async (event) => {
    const id = event.params.id;

    try {
      const result = await sendAnnouncementEmailonDocCreation(id);

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
