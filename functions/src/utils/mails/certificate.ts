import * as brevo from "@getbrevo/brevo";
import { logger } from "firebase-functions";

export type CertificateEmail = {
  email: string;
  subject: string;
  body: string;
  vars: {
    CERTIFICATE_LINK: string;
    USER_NAME: string;
    COURSE_NAME: string;
    REMARK: string;
  }
};

const linkifyText = (text: string): string => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with anchor tags
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" style="color:#d32f2f; text-decoration:none; word-break:break-all;">${url}</a>`;
  });
};

const textToHtml = (text: string): string => {
  // Split by line breaks
  const lines = text.split('\n');

  // Process each line
  const htmlLines = lines.map(line => {
    // Convert URLs to links
    const linkedLine = linkifyText(line);

    // Wrap in paragraph if not empty
    if (linkedLine.trim()) {
      return `<p style="margin:8px 0; font-size:15px; line-height:1.6;">${linkedLine}</p>`;
    }
    return '<br>';
  });

  return htmlLines.join('');
};

export const sendCertificateMail = async (
  data: CertificateEmail,
  brevoApiKey: string
) => {
  const { email, subject, body, vars } = data;

  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    const formattedBody = textToHtml(body.replace(/\{\{(\w+)\}\}/g, (_match, varName: keyof typeof vars) => vars[varName] || ''));
    const formattedSubject = subject.replace(/\{\{(\w+)\}\}/g, (_match, varName: keyof typeof vars) => vars[varName] || '');

    // --- Prepare and send email via Brevo ---
    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "no_reply@vizuara.com" },
      to: [{ email }],
      bcc: [
        { email: "thesreedath@gmail.com" },
        { email: "raj.dandekar8@gmail.com" },
        { email: "rajatdandekar@gmail.com" }
      ],
      subject: formattedSubject,
      htmlContent: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formattedSubject}</title>
</head>
<body style="margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f5f5f5;">

  <div style="max-width:600px; margin:24px auto; background:#ffffff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.1); overflow:hidden;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0f4396 0%, #1565c0 100%); padding:32px 24px; text-align:center;">
      <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" style="height:40px; margin-bottom:16px;" />
      <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:600; letter-spacing:0.5px;">Welcome to Vizuara!</h1>
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
          Team Vizuara
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding:20px 24px; background:#f8f9fa; text-align:center; border-top:1px solid #e0e0e0;">
      <p style="margin:0; font-size:12px; color:#999; line-height:1.5;">
        This is an automated message. Please do not reply to this email.<br>
        © ${new Date().getFullYear()} Vizuara. All rights reserved.
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
