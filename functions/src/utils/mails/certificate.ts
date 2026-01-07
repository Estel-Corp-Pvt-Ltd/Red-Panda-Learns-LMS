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
    REMARK?: string;
  };
};

// const linkifyText = (text: string): string => {
//   const urlRegex = /(https?:\/\/[^\s]+)/g;
//   return text.replace(urlRegex, (url) => {
//     return `<a href="${url}" target="_blank" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${url}</a>`;
//   });
// };

// const textToHtml = (text: string): string => {
//   const lines = text.split("\n");
//   const htmlLines = lines.map((line) => {
//     const linkedLine = linkifyText(line);
//     if (linkedLine.trim()) {
//       return `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #4a4a5a;">${linkedLine}</p>`;
//     }
//     return `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">&nbsp;</p>`;
//   });
//   return htmlLines.join("");
// };

export const sendCertificateMail = async (data: CertificateEmail, brevoApiKey: string) => {
  const { email, subject, vars } = data;

  try {
    const brevoApi = new brevo.TransactionalEmailsApi();
    brevoApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

    // const formattedBody = textToHtml(
    //   body.replace(/\{\{(\w+)\}\}/g, (_match, varName: keyof typeof vars) => vars[varName] || "")
    // );
    const formattedSubject = subject.replace(
      /\{\{(\w+)\}\}/g,
      (_match, varName: keyof typeof vars) => vars[varName] || ""
    );

    const sendSmtpEmail = {
      sender: { name: "Vizuara", email: "no_reply@vizuara.com" },
      to: [{ email }],
      bcc: [
        { email: "thesreedath@gmail.com" },
        { email: "raj.dandekar8@gmail.com" },
        { email: "rajatdandekar@gmail.com" },
      ],
      subject: formattedSubject,
      htmlContent: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${formattedSubject}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; -webkit-font-smoothing: antialiased; background-color: #f3e8ff;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 25%, #e0f2fe 50%, #fef3c7 100%); min-height: 100vh;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <!-- Container -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(168, 85, 247, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
                    <tr>
                        <td style="padding: 48px 44px;">
                            
                            <!-- Logo Section -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(168, 85, 247, 0.12);">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td valign="middle" style="padding-right: 14px;">
                                                    <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;">
                                                </td>
                                                <td valign="middle">
                                                    <!--[if mso]>
                                                    <span style="color: #a855f7; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Vizuara AI Labs</span>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <span style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.5px;">Vizuara AI Labs</span>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Spacer -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr><td height="28" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                            </table>

                            <!-- Badge -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%); color: #16a34a; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(34, 197, 94, 0.15);">
                                                    <span style="display: inline-block; width: 6px; height: 6px; background-color: #22c55e; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                                                    Certificate Ready
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Title -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <h1 style="font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">Congratulations!</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 28px;">
                                        <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0; max-width: 400px;">
                                            Hi <strong style="color: #1a1a2e;">${
                                              vars.USER_NAME
                                            }</strong>,<br><br>
                                            Your certificate for completing the course is now ready!
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Course Info Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.15); margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td>
                                                    <p style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Course Completed</p>
                                                    <p style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; line-height: 1.4;">${
                                                      vars.COURSE_NAME
                                                    }</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

  ${
    vars.REMARK && vars.REMARK.trim()
      ? `
                            <!-- Remark Card -->
                            <table role="presentation"  width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px; background-color: #fefce8; border-radius: 12px; border: 1px solid #fde047;">
                                <tr>
                                    <td style="padding: 24px 28px;">
                                        <p style="font-size: 12px; font-weight: 600; color: #a16207; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Remark</p>
                                        <p style="font-size: 14px; color: #854d0e; margin: 0; line-height: 1.5;">${vars.REMARK}</p>
                                    </td>
                                </tr>
                            </table>
                            `
      : ""
  }
                            
                            <!-- Content Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.12);">
                                <tr>
                                    <td align="center" style="padding: 36px 24px;">
                                        <p style="font-size: 15px; color: #4a4a5a; margin: 0 0 24px 0;">Click below to download your certificate:</p>
                                        
                                        <!-- Button -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius: 12px;">
                                                    <!--[if mso]>
                                                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${
                                                      vars.CERTIFICATE_LINK
                                                    }" style="height:52px;v-text-anchor:middle;width:220px;" arcsize="23%" fillcolor="#a855f7">
                                                        <w:anchorlock/>
                                                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Download Certificate</center>
                                                    </v:roundrect>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <a href="${
                                                      vars.CERTIFICATE_LINK
                                                    }" target="_blank" style="background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%); color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
                                                        Download Certificate
                                                    </a>
                                                    <!--<![endif]-->
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Fallback Link -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                                            <tr>
                                                <td align="center">
                                                    <p style="font-size: 13px; color: #6a6a7a; margin: 0 0 8px 0;">Or use this direct link:</p>
                                                    <a href="${
                                                      vars.CERTIFICATE_LINK
                                                    }" target="_blank" style="word-break: break-all; font-size: 13px; color: #3b82f6; text-decoration: underline; font-family: monospace; line-height: 1.5;">${
        vars.CERTIFICATE_LINK
      }</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                          

                            <!-- Encouragement Message -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 14px; color: #6a6a7a; line-height: 1.6; margin: 0; max-width: 380px;">
                                            Great job on completing the course, <strong>${
                                              vars.USER_NAME
                                            }</strong>! Keep learning and growing with Vizuara.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Spacer -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr><td height="36" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                            </table>

                            <!-- Divider -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);"></td>
                                </tr>
                            </table>

                            <!-- Spacer -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr><td height="36" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                            </table>

                            <!-- Footer -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 14px; color: #6a6a7a; font-weight: 500; margin: 0;">
                                            Happy Learning!
                                        </p>
                                    </td>
                                </tr>
                                <tr><td height="8" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 16px; font-weight: 700; color: #a855f7; margin: 0;">
                                            Team Vizuara
                                        </p>
                                    </td>
                                </tr>
                                <tr><td height="20" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                                <tr><td height="4" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                                            &copy; ${new Date().getFullYear()} Vizuara. All rights reserved.
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
</html>`,
    };

    await brevoApi.sendTransacEmail(sendSmtpEmail);

    logger.info(`Certificate email sent to ${email} for course ${vars.COURSE_NAME}`);
    return { success: true };
  } catch (error: any) {
    logger.error("Error sending certificate email:", error);
    return { success: false, error: error.message };
  }
};
