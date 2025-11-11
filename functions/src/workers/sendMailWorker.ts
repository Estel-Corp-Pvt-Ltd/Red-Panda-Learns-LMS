import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { PaymentDetails, sendPaymentConfirmation } from "../utils/invoice";

// 🔐 Define the secret
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");


export const sendMailWorker = onMessagePublished({
  topic: "send-mail",
  secrets: [BREVO_API_KEY],
},
  async (event) => {
    try {
      const data = event.data.message.json as PaymentDetails;
      logger.info("📧 Worker received mail payload:", data);

      const apiKey = BREVO_API_KEY.value();
      await sendPaymentConfirmation(data, apiKey);

      logger.info("✅ Email sent successfully via worker:", data.email);
    } catch (err: any) {
      logger.error("❌ Worker email sending failed:", err);
    }
  }
);
