import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { CourseWelcomeEmail, sendCourseWelcomeMessage } from "../utils/course";

// 🔐 Define the secret
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");


export const sendCourseWelcomeMailWorker = onMessagePublished({
  topic: "course-welcome-message",
  secrets: [BREVO_API_KEY],
},
  async (event) => {
    try {
      const data = event.data.message.json as CourseWelcomeEmail;
      logger.info("📧 Worker received mail payload:", data);

      const apiKey = BREVO_API_KEY.value();
      await sendCourseWelcomeMessage(data, apiKey);


      logger.info("✅ Email sent successfully via worker:", data.email);
    } catch (err: any) {
      logger.error("❌ Worker email sending failed:", err);
    }
  }
);

// export const 
