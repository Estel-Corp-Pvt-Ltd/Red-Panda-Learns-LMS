import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";

export type CourseWelcomeEmail = {
  email: string;
  subject: string;
  body: string;
};

/**
 * Converts plain text URLs to clickable HTML links
 */
const linkifyText = (text: string): string => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with anchor tags
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" style="color:#d32f2f; text-decoration:none; word-break:break-all;">${url}</a>`;
  });
};

/**
 * Converts plain text to HTML with proper formatting
 * - Preserves line breaks
 * - Converts URLs to clickable links
 * - Handles basic formatting
 */
const textToHtml = (text: string): string => {
  // Split by line breaks
  const lines = text.split("\n");

  // Process each line
  const htmlLines = lines.map((line) => {
    // Convert URLs to links
    const linkedLine = linkifyText(line);

    // Wrap in paragraph if not empty
    if (linkedLine.trim()) {
      return `<p style="margin:8px 0; font-size:15px; line-height:1.6;">${linkedLine}</p>`;
    }
    return "<br>";
  });

  return htmlLines.join("");
};

export const sendCourseWelcomeMessage = async (data: CourseWelcomeEmail, brevoApiKey: string) => {
  const { email, subject, body } = data;

  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

    const formattedBody = textToHtml(body);

    // --- Prepare and send email via Brevo ---
    const sendSmtpEmail = {
      sender: { name: "RedPanda Learns", email: "no_reply@RedPanda Learns.com" },
      to: [{ email }],
      bcc: [
        { email: "thesreedath@gmail.com" },
        { email: "raj.dandekar8@gmail.com" },
        { email: "rajatdandekar@gmail.com" },
      ],
      subject: subject,
      htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Welcome Message</title>
</head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f5f5f5;">

  <div style="max-width:600px; margin:24px auto; background:#ffffff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.1); overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0f4396 0%, #1565c0 100%); padding:32px 24px; text-align:center;">
      <img src="https://RedPanda Learns.ai/logo.png" alt="RedPanda Learns" style="max-width:140px; height:auto; display:block; margin:0 auto 16px auto;">
      <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:600; letter-spacing:0.5px;">Welcome to RedPanda Learns!</h1>
    </div>

    <!-- Body Content -->
    <div style="padding:32px 24px;">

      <div style="margin:24px 0; padding:20px; background:#f8f9fa; border-radius:6px;">
        ${formattedBody}
      </div>

      <!-- Closing -->
      <div style="margin:32px 0 0 0; padding-top:24px; border-top:1px solid #e0e0e0;">
        <p style="margin:0 0 8px 0; font-size:15px; color:#333;">
          Happy Learning!
        </p>
        <p style="margin:0; font-size:16px; font-weight:600; color:#0f4396;">
          Team RedPanda Learns
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:20px 24px; background:#f8f9fa; text-align:center; border-top:1px solid #e0e0e0;">
      <p style="margin:0; font-size:12px; color:#999; line-height:1.5;">
        This is an automated message. Please do not reply to this email.<br>
        © ${new Date().getFullYear()} RedPanda Learns. All rights reserved.
      </p>
    </div>

  </div>

</body>
</html>
  `,
    };

    await brevoApi.sendTransacEmail(sendSmtpEmail);

    logger.info(`✅ Course welcome email sent to ${email} for course ${subject}`);
    return { success: true };
  } catch (error: any) {
    logger.error("❌ Error sending course welcome email:", error);
    return { success: false, error: error.message };
  }
};
