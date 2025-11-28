// sendMail.ts
import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}
const pubsub = new PubSub();
export async function sendMail(payload: MailPayload) {
  try {
    const topicName = "send-mail-notif"; // your Pub/Sub topic
    const dataBuffer = Buffer.from(JSON.stringify(payload));

    await pubsub.topic(topicName).publish(dataBuffer);

    logger.info("📧 Email queued successfully:", payload.to);
    return { success: true };
  } catch (err: any) {
    logger.error("❌ Failed to queue email:", err);
    return { success: false, error: err.message };
  }
}
export function buildEvaluationEmail( evalLink: string) {
return `
<html>
  <head>
    <meta charset="UTF-8">
    <title>New Submission Notification</title>
    <style>
      /* Base Reset */
      body, html {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: hsl(36, 95%, 98%);
        color: hsl(30, 2%, 16%);
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background: linear-gradient(180deg, #ffffff 0%, #f9f9fb 100%);
        border-radius: 16px;
        padding: 32px 40px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.06);
        border: 1px solid #eee;
      }

      .logo-section {
        text-align: center;
        margin-bottom: 24px;
      }

      .logo-section img {
        width: 50px;
        vertical-align: middle;
      }

      .logo-text {
        font-size: 22px;
        font-weight: bold;
        margin-left: 10px;
        vertical-align: middle;
        display: inline-block;
        background: linear-gradient(135deg, hsl(300, 100%, 50%), hsl(198, 75%, 52%));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      h2 {
        font-size: 24px;
        margin-bottom: 12px;
        background: var(--text-gradient);
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
      }

      p {
        font-size: 16px;
        color: hsl(30, 10%, 40%);
        line-height: 1.6;
        margin: 10px 0;
      }

      a.btn {
        display: inline-block;
        padding: 14px 26px;
        background-image: linear-gradient(135deg, hsl(36, 95%, 61%), hsl(300, 100%, 50%), hsl(198, 75%, 52%));
        color: #fff;
        text-decoration: none;
        font-weight: 600;
        border-radius: 8px;
        margin-top: 20px;
        font-size: 16px;
        transition: opacity 0.3s ease;
      }

      a.btn:hover {
        opacity: 0.9;
      }

      .link-copy {
        word-break: break-all;
        font-size: 14px;
        color: hsl(198, 75%, 40%);
      }

      hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 32px 0;
      }

      .footer {
        text-align: center;
        font-size: 14px;
        color: hsl(30, 10%, 40%);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-section">
        <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" />
        <span class="logo-text">Vizuara AI Labs</span>
      </div>

      <h2>Hello,</h2>

      <p>A new submission has just been made and is ready for your evaluation.</p>
      <p>Click the button below to open and review:</p>

      <p style="text-align: center;">
        <a href="${evalLink}" class="btn">View Submission</a>
      </p>

      <p>If that doesn’t work, use the direct link below:</p>
      <p class="link-copy">${evalLink}</p>

      <hr />

      <div class="footer">
        Thanks again,<br />
        — The Vizuara Team
      </div>
    </div>
  </body>
</html>
`
}
