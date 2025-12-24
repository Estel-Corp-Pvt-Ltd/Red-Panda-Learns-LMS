import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import { ComplaintCategory, ComplaintStatus } from "../types/general";

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: "INITIAL" | "REMINDER"; // NEW
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
export function buildEvaluationEmail(evalLink: string) {
return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>New Submission</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      /* Base Reset */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-font-smoothing: antialiased; }

      /* Default (Light Mode) Variables */
      :root {
        --bg-gradient: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);
        --container-bg: rgba(255, 255, 255, 0.95);
        --container-border: 1px solid rgba(255, 255, 255, 0.9);
        --text-main: #1a1a2e;
        --text-body: #4a4a5a;
        --text-muted: #6a6a7a;
        --card-bg: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%);
        --card-border: 1px solid rgba(255, 0, 255, 0.12);
        --link-color: #d946ef;
        --divider: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);
      }

      /* Logo Gradient Logic */
      .logo-text {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.5px;
      }
      .logo-text-fallback { color: #d946ef; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

      /* Components */
      .badge {
        display: inline-block;
        background: linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(34, 174, 209, 0.1) 100%);
        color: #a21caf;
        font-size: 11px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 50px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(255, 0, 255, 0.15);
      }

      .btn-primary {
        display: inline-block;
        background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%);
        color: #ffffff !important;
        font-weight: 700;
        font-size: 16px;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 12px;
        box-shadow: 0 4px 14px rgba(217, 70, 239, 0.4);
        transition: all 0.3s ease;
        text-align: center;
        mso-padding-alt: 0;
        border: 0;
      }

      .btn-primary:hover {
        box-shadow: 0 6px 20px rgba(217, 70, 239, 0.6);
        transform: translateY(-1px);
      }

      .link-copy {
        word-break: break-all;
        font-size: 13px;
        color: #3b82f6;
        text-decoration: underline;
        font-family: monospace;
        line-height: 1.5;
      }

      /* Dark Mode Overrides */
      @media (prefers-color-scheme: dark) {
        body, .wrapper {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #111827 100%) !important;
        }
        .container {
          background-color: #171726 !important;
          border: 1px solid #2e2e42 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        h1, h2, h3 { color: #f8fafc !important; }
        p, .announcement-body { color: #cbd5e1 !important; }
        .badge {
          background: rgba(217, 70, 239, 0.15) !important;
          color: #e879f9 !important;
          border-color: rgba(217, 70, 239, 0.3) !important;
        }
        .announcement-card {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .footer-text { color: #94a3b8 !important; }
        .link-copy { color: #60a5fa !important; }
      }

      /* Mobile Styles */
      @media only screen and (max-width: 600px) {
        .wrapper { padding: 12px !important; }
        .content-padding { padding: 32px 20px !important; }
        .logo-text { font-size: 20px !important; }
        h2 { font-size: 22px !important; }
        .btn-primary { display: block !important; width: 100% !important; padding: 14px 20px !important; }
      }
    </style>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          
          <!-- Container -->
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px;  box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
            <tr>
              <td class="content-padding" style="padding: 48px 44px;">
                
                <!-- Logo Section -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 14px;">
                            <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
                          </td>
                          <td valign="middle">
                            <!--[if mso]>
                            <span class="logo-text-fallback" style="color: #d946ef; font-size: 24px; font-weight: 800;">Vizuara AI Labs</span>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <span class="logo-text" style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Vizuara AI Labs</span>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 28px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Badge -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(255, 0, 255, 0.12) 0%, rgba(34, 174, 209, 0.12) 100%); color: #a21caf; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(255, 0, 255, 0.15);">
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #d946ef; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                        Action Required
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Title & Intro -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <h2 style="font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">Submission Received</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0; max-width: 400px;">
                        Hello, a new assignment submission has just been uploaded and is ready for your evaluation.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Main Action Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(255, 0, 255, 0.12);">
                  <tr>
                    <td align="center" style="padding: 40px 24px;">
                      
                      <!-- Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="border-radius: 12px; background: #d946ef;">
                            <a href="${evalLink}" class="btn-primary" style="background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%); color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; border: 0;">
                              Evaluate Submission
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Fallback Link -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                         <tr>
                           <td align="center">
                             <p style="font-size: 13px; color: #6a6a7a; margin-bottom: 8px;">Or use this direct link:</p>
                             <a href="${evalLink}" class="link-copy" style="word-break: break-all; font-size: 13px; color: #3b82f6; text-decoration: underline;">${evalLink}</a>
                           </td>
                         </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);"></td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Footer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <p class="footer-text" style="font-size: 14px; color: #6a6a7a; font-weight: 500; margin: 0;">
                        Made with <span style="color: #d946ef;">♥</span> by the <span style="font-weight: 700; color: #d946ef;">Vizuara</span> Team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td height="12" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                  <tr>
                     <td align="center">
                        <p class="footer-text" style="font-size: 12px; color: #8a8a9a; margin: 0;">
                           Automated Notification System
                        </p>
                     </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
          
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}


export function buildReminderEmail(evalLink: string) {
return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Submission Reminder</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      /* Base Reset */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-font-smoothing: antialiased; }

      /* Default (Light Mode) Variables */
      :root {
        --bg-gradient: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);
        --container-bg: rgba(255, 255, 255, 0.95);
        --container-border: 1px solid rgba(255, 255, 255, 0.9);
        --text-main: #1a1a2e;
        --text-body: #4a4a5a;
        --text-muted: #6a6a7a;
        --card-bg: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%);
        --card-border: 1px solid rgba(255, 0, 255, 0.12);
        --link-color: #d946ef;
        --divider: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);
      }

      /* Logo Gradient Logic */
      .logo-text {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.5px;
      }
      .logo-text-fallback { color: #d946ef; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

      /* Components */
      .badge {
        display: inline-block;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 70, 239, 0.1) 100%);
        color: #b45309; /* Amber darken for contrast */
        font-size: 11px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 50px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(245, 158, 11, 0.2);
      }

      .btn-primary {
        display: inline-block;
        background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%);
        color: #ffffff !important;
        font-weight: 700;
        font-size: 16px;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 12px;
        box-shadow: 0 4px 14px rgba(217, 70, 239, 0.4);
        transition: all 0.3s ease;
        text-align: center;
        mso-padding-alt: 0;
        border: 0;
      }

      .btn-primary:hover {
        box-shadow: 0 6px 20px rgba(217, 70, 239, 0.6);
        transform: translateY(-1px);
      }

      .link-copy {
        word-break: break-all;
        font-size: 13px;
        color: #3b82f6;
        text-decoration: underline;
        font-family: monospace;
        line-height: 1.5;
      }

      /* Dark Mode Overrides */
      @media (prefers-color-scheme: dark) {
        body, .wrapper {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #111827 100%) !important;
        }
        .container {
          background-color: #171726 !important;
          border: 1px solid #2e2e42 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        h1, h2, h3 { color: #f8fafc !important; }
        p, .announcement-body { color: #cbd5e1 !important; }
        .badge {
          background: rgba(245, 158, 11, 0.15) !important;
          color: #fbbf24 !important; /* Amber light */
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        .announcement-card {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .footer-text { color: #94a3b8 !important; }
        .link-copy { color: #60a5fa !important; }
      }

      /* Mobile Styles */
      @media only screen and (max-width: 600px) {
        .wrapper { padding: 12px !important; }
        .content-padding { padding: 32px 20px !important; }
        .logo-text { font-size: 20px !important; }
        h2 { font-size: 22px !important; }
        .btn-primary { display: block !important; width: 100% !important; padding: 14px 20px !important; }
      }
    </style>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          
          <!-- Container -->
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px;  box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
            <tr>
              <td class="content-padding" style="padding: 48px 44px;">
                
                <!-- Logo Section -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 14px;">
                            <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
                          </td>
                          <td valign="middle">
                            <!--[if mso]>
                            <span class="logo-text-fallback" style="color: #d946ef; font-size: 24px; font-weight: 800;">Vizuara AI Labs</span>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <span class="logo-text" style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Vizuara AI Labs</span>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 28px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Badge -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 70, 239, 0.1) 100%); color: #b45309; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(245, 158, 11, 0.2);">
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                        Pending Review
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Title & Intro -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">
                      <h2 style="font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">Submission Reminder</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0; max-width: 400px;">
                        This is a friendly reminder that a student submission is still pending your evaluation.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Main Action Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(255, 0, 255, 0.12);">
                  <tr>
                    <td align="center" style="padding: 40px 24px;">
                      
                      <!-- Button -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="border-radius: 12px; background: #d946ef;">
                            <a href="${evalLink}" class="btn-primary" style="background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%); color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; border: 0;">
                              Review Submission
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Fallback Link -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                         <tr>
                           <td align="center">
                             <p style="font-size: 13px; color: #6a6a7a; margin-bottom: 8px;">If the button doesn't work, use the direct link below:</p>
                             <a href="${evalLink}" class="link-copy" style="word-break: break-all; font-size: 13px; color: #3b82f6; text-decoration: underline;">${evalLink}</a>
                           </td>
                         </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);"></td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Footer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <p class="footer-text" style="font-size: 14px; color: #6a6a7a; font-weight: 500; margin: 0;">
                        Thank you,<br />
                        — The <span style="font-weight: 700; color: #d946ef;">Vizuara</span> Team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td height="12" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
          
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

export const buildComplaintRedressalEmail = (
  params: {
    complaintId: string;
    userName: string;
    category: ComplaintCategory;
    status: ComplaintStatus;
    description: string;
    imageUrls?: string[];
    actionTitle: string;
    messageBody: string;
    resolutionSummary?: string;
    actionDate: string;
  }
): string => {

  const {
    complaintId,
    userName,
    category,
    status,
    description,
    imageUrls,
    actionTitle,
    messageBody,
    resolutionSummary,
    actionDate,
  } = params;

  const linkify = (text: string): string => {
    if (!text) return text;

    const urlRegex =
      /((https?:\/\/)([\w.-]+)(:[0-9]+)?(\/[\w./?%&=+#-]*)?)/gi;

    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  };

   const renderImages = (imageURLs?: string[]): string => {
    if (!imageURLs || imageURLs.length === 0) return "";
    return `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed rgba(120, 120, 120, 0.2);">
        <p style="font-size: 12px; font-weight: 700; color: #6a6a7a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Attachments</p>
        ${imageURLs
          .map(
            (url) => `
          <div style="margin-bottom: 12px;">
            <img 
              src="${url}" 
              alt="Attachment" 
              style="max-width: 100%; border-radius: 12px; border: 1px solid rgba(120,120,120, 0.1); display: block;" 
            />
          </div>
        `
          )
          .join("")}
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${actionTitle}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      /* Base Reset */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; margin: 0 !important; padding: 0 !important; width: 100% !important; -webkit-font-smoothing: antialiased; }

      /* Default (Light Mode) Variables */
      :root {
        --text-main: #1a1a2e;
        --text-body: #4a4a5a;
        --text-muted: #6a6a7a;
        --card-bg: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%);
        --card-border: 1px solid rgba(255, 0, 255, 0.12);
        --link-color: #d946ef;
      }

      /* Logo Gradient Logic */
      .logo-text {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.5px;
      }
      .logo-text-fallback { color: #d946ef; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

      /* Components */
      .badge {
        display: inline-block;
        background: linear-gradient(135deg, rgba(34, 174, 209, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
        color: #0284c7; 
        font-size: 11px;
        font-weight: 700;
        padding: 6px 14px;
        border-radius: 50px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(34, 174, 209, 0.2);
      }

      .meta-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #6a6a7a;
        letter-spacing: 0.5px;
        padding-bottom: 4px;
        display: block;
      }

      .meta-value {
        font-size: 14px;
        font-weight: 500;
        color: #1a1a2e;
        padding-bottom: 16px;
        display: block;
        word-break: break-word;
      }

      .resolution-box {
        background-color: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 12px;
        padding: 20px;
        margin-top: 24px;
      }

      /* Dark Mode Overrides */
      @media (prefers-color-scheme: dark) {
        body, .wrapper {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #111827 100%) !important;
        }
        .container {
          background-color: #171726 !important;
          border: 1px solid #2e2e42 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        h1, h2, h3 { color: #f8fafc !important; }
        p, .announcement-body { color: #cbd5e1 !important; }
        .meta-label { color: #94a3b8 !important; }
        .meta-value { color: #e2e8f0 !important; }
        .badge {
          background: rgba(34, 174, 209, 0.15) !important;
          color: #38bdf8 !important;
          border-color: rgba(34, 174, 209, 0.3) !important;
        }
        .announcement-card {
          background: rgba(255, 255, 255, 0.03) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
        .resolution-box {
           background-color: rgba(16, 185, 129, 0.05) !important;
           border-color: rgba(16, 185, 129, 0.15) !important;
        }
        .footer-text { color: #94a3b8 !important; }
        a { color: #60a5fa !important; }
      }

      /* Mobile Styles */
      @media only screen and (max-width: 600px) {
        .wrapper { padding: 12px !important; }
        .content-padding { padding: 32px 20px !important; }
        .logo-text { font-size: 20px !important; }
        h2 { font-size: 22px !important; }
      }
    </style>
  </head>

  <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          
          <!-- Container -->
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px;  box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
            <tr>
              <td class="content-padding" style="padding: 48px 44px;">
                
                <!-- Logo Section -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 14px;">
                            <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
                          </td>
                          <td valign="middle">
                            <!--[if mso]>
                            <span class="logo-text-fallback" style="color: #d946ef; font-size: 24px; font-weight: 800;">Vizuara AI Labs</span>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <span class="logo-text" style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Vizuara AI Labs</span>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 28px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Badge -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(34, 174, 209, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%); color: #0284c7; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(34, 174, 209, 0.2);">
                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #0ea5e9; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                        Support Update
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Header -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="left" style="padding-bottom: 24px;">
                       <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0;">Hello ${userName},</h2>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding-bottom: 24px;">
                      <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0;">
                        ${linkify(messageBody)}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Ticket Details Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(255, 0, 255, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(255, 0, 255, 0.12);">
                  <tr>
                    <td style="padding: 24px;">
                      
                      <!-- Info Grid -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="50%" valign="top">
                            <span class="meta-label">Complaint ID</span>
                            <span class="meta-value" style="font-family: monospace; font-size: 13px;">${complaintId}</span>
                          </td>
                          <td width="50%" valign="top">
                            <span class="meta-label">Category</span>
                            <span class="meta-value">${category}</span>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top">
                            <span class="meta-label">Status</span>
                            <span class="meta-value">${status}</span>
                          </td>
                          <td width="50%" valign="top">
                            <span class="meta-label">Updated On</span>
                            <span class="meta-value">${actionDate}</span>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" valign="top">
                            <span class="meta-label">Handled By</span>
                            <span class="meta-value">Vizuara Support Team</span>
                          </td>
                        </tr>
                         <tr>
                          <td colspan="2" valign="top">
                            <span class="meta-label">Description</span>
                            <span class="meta-value">${description}</span>
                          </td>
                        </tr>
                      </table>

                      <!-- Render Attachments -->
                      ${imageUrls && imageUrls.length > 0 ? renderImages(imageUrls) : ""}

                    </td>
                  </tr>
                </table>

                <!-- Resolution Summary (Conditional) -->
                ${
                  resolutionSummary
                    ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                  <tr>
                    <td>
                      <div class="resolution-box" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px;">
                        <h4 style="font-size: 14px; font-weight: 700; color: #059669; text-transform: uppercase; margin: 0 0 8px 0;">Resolution Summary</h4>
                        <p style="font-size: 15px; color: #4a4a5a; line-height: 1.6; margin: 0;">${resolutionSummary}</p>
                      </div>
                    </td>
                  </tr>
                </table>
                `
                    : ""
                }

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);"></td>
                  </tr>
                </table>

                <!-- Spacer -->
                <div style="height: 36px; font-size: 0; line-height: 0;">&nbsp;</div>

                <!-- Footer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <p class="footer-text" style="font-size: 14px; color: #6a6a7a; font-weight: 500; margin: 0;">
                        Made with <span style="color: #d946ef;">♥</span> by the <span style="font-weight: 700; color: #d946ef;">Vizuara</span> Team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td height="12" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <a href="https://vizuara.ai" style="font-size: 13px; color: #8a8a9a; text-decoration: none; font-weight: 500;">Website</a>
                          </td>
                          <td style="padding: 0 12px; color: #8a8a9a; font-size: 10px;">•</td>
                          <td>
                            <a href="https://vizuara.ai/privacy" style="font-size: 13px; color: #8a8a9a; text-decoration: none; font-weight: 500;">Privacy</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
          
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};
