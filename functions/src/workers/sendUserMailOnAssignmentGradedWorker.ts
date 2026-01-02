import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";

// Fetch the Brevo API key from Firebase secrets
const BREVO_API_KEY = defineSecret("BREVO_API_KEY");

// Function to send email using Brevo SMTP
export const sendUserMailOnAssignmentGradedWorker =  
  onMessagePublished(
    {
      topic: "send-mail-to-user-on-assignment-graded", // Dynamic topic name for flexibility
      secrets: [BREVO_API_KEY], // API key for authentication
    },
    async (event) => {
      try {
        const payload = event.data.message.json;
        logger.info("📧 Worker received mail payload:", payload);
        
        // Fetch API key from Firebase secrets
        const apiKey = BREVO_API_KEY.value();

        // Sending the email request to Brevo's API
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            sender: {
              name: "Vizuara", // Sender's name (you can change it)
              email: "no_reply@vizuara.com", // Sender's email
            },
            to: [{ email: payload.to }], // Recipient email
            subject: payload.subject, // Subject passed in the payload
            htmlContent: payload.html, // HTML content of the email
            textContent: payload.text || payload.html.replace(/<[^>]+>/g, ""), // Plain text version (fallback)
          }),
        });

        // Check if the request was successful
        if (response.ok) {
          logger.info("✅ Email sent successfully via worker:", payload.to);
        } else {
          logger.error("❌ Failed to send email. Status:", response.status);
        }
      } catch (err: any) {
        logger.error("❌ Worker email sending failed:", err);
      }
    }
  );
