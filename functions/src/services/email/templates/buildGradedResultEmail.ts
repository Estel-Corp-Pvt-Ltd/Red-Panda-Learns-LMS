export function buildGradedResultEmail(
  evalLink: string,
  userName: string,
  marks: number,
  assignmentTitle: string
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Assignment Graded</title>
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
            font-size: 24px; font-weight: 800;
            background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
            letter-spacing: -0.5px;
        }
        .logo-text-fallback { color: #d946ef; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

        /* Components */
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
            color: #16a34a;
            font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px;
            text-transform: uppercase; letter-spacing: 1px;
            border: 1px solid rgba(34, 197, 94, 0.15);
        }
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%);
            color: #ffffff !important; font-weight: 700; font-size: 16px; text-decoration: none;
            padding: 16px 32px; border-radius: 12px;
            box-shadow: 0 4px 14px rgba(217, 70, 239, 0.4);
            transition: all 0.3s ease; text-align: center;
            mso-padding-alt: 0; border: 0;
        }
        .btn-primary:hover { box-shadow: 0 6px 20px rgba(217, 70, 239, 0.6); transform: translateY(-1px); }
        .link-copy { word-break: break-all; font-size: 13px; color: #3b82f6; text-decoration: underline; font-family: monospace; line-height: 1.5; }

        /* Dark Mode Overrides */
        @media (prefers-color-scheme: dark) {
            body, .wrapper { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #111827 100%) !important; }
            .container { background-color: #171726 !important; w box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important; }
            h1, h2, h3 { color: #f8fafc !important; }
            p, .announcement-body { color: #cbd5e1 !important; }
            .badge { background: rgba(34, 197, 94, 0.15) !important; color: #4ade80 !important; border-color: rgba(34, 197, 94, 0.3) !important; }
            .announcement-card { background: rgba(255, 255, 255, 0.03) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
            .info-card { background: rgba(255, 255, 255, 0.03) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
            .info-label { color: #94a3b8 !important; }
            .info-value { color: #f1f5f9 !important; }
            .marks-value { color: #4ade80 !important; }
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
            .info-card-inner { padding: 20px 16px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <!-- Container -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
                    <tr>
                        <td class="content-padding" style="padding: 48px 44px;">
                            <!-- Logo Section -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td valign="middle" style="padding-right: 14px;">
                                                    <img src="https://RedPanda Learns.ai/logo.png" alt="RedPanda Learns Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
                                                </td>
                                                <td valign="middle">
                                                    <!--[if mso]>
                                                    <span class="logo-text-fallback" style="color: #d946ef; font-size: 24px; font-weight: 800;">RedPanda Learns</span>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <span class="logo-text" style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">RedPanda Learns</span>
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
                                        <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%); color: #16a34a; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(34, 197, 94, 0.15);">
                                            <span style="display: inline-block; width: 6px; height: 6px; background-color: #22c55e; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                                            Graded
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Title & Intro -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <h2 style="font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">Your Assignment Has Been Graded</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 28px;">
                                        <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0; max-width: 400px;">
                                            Hi <strong>${userName}</strong>,<br /><br />
                                            Great news! Your assignment submission has been reviewed and graded. Here are your results:
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Assignment Info Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="info-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.15); margin-bottom: 20px;">
                                <tr>
                                    <td class="info-card-inner" style="padding: 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <!-- Assignment Title Row -->
                                            <tr>
                                                <td style="padding-bottom: 16px; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                                    <p class="info-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Assignment</p>
                                                    <p class="info-value" style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; line-height: 1.4;">${assignmentTitle}</p>
                                                </td>
                                            </tr>
                                            <!-- Marks Row -->
                                            <tr>
                                                <td style="padding-top: 16px;">
                                                    <p class="info-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Marks Obtained</p>
                                                    <p class="marks-value" style="font-size: 32px; font-weight: 800; color: #16a34a; margin: 0; line-height: 1.2;">${marks}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Main Action Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.12);">
                                <tr>
                                    <td align="center" style="padding: 36px 24px;">
                                        <p style="font-size: 15px; color: #4a4a5a; margin: 0 0 20px 0;">Click below to view detailed feedback and results:</p>
                                        <!-- Button -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius: 12px; background: #d946ef;">
                                                    <a href="${evalLink}" class="btn-primary" style="background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%); color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; border: 0;">
                                                        View My Results
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

                            <!-- Encouragement Message -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 14px; color: #6a6a7a; line-height: 1.6; margin: 0; max-width: 380px;">
                                            Keep up the great work, ${userName}! Every submission is a step forward in your learning journey.
                                        </p>
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
                                            Made with <span style="color: #d946ef;">&#9829;</span> by the <span style="font-weight: 700; color: #d946ef;">RedPanda Learns</span> Team
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
</html>`;
}

export function buildReGradedResultEmail(
  evalLink: string,
  userName: string,
  marks: number,
  assignmentTitle: string
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Assignment Re-evaluated</title>

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
            font-size: 24px; font-weight: 800;
            background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
            letter-spacing: -0.5px;
        }
        .logo-text-fallback { color: #d946ef; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }

        /* Components */
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%);
            color: #16a34a;
            font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px;
            text-transform: uppercase; letter-spacing: 1px;
            border: 1px solid rgba(34, 197, 94, 0.15);
        }
        .btn-primary {
            display: inline-block;
            background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%);
            color: #ffffff !important; font-weight: 700; font-size: 16px; text-decoration: none;
            padding: 16px 32px; border-radius: 12px;
            box-shadow: 0 4px 14px rgba(217, 70, 239, 0.4);
            transition: all 0.3s ease; text-align: center;
            mso-padding-alt: 0; border: 0;
        }
        .btn-primary:hover { box-shadow: 0 6px 20px rgba(217, 70, 239, 0.6); transform: translateY(-1px); }
        .link-copy { word-break: break-all; font-size: 13px; color: #3b82f6; text-decoration: underline; font-family: monospace; line-height: 1.5; }

        /* Dark Mode Overrides */
        @media (prefers-color-scheme: dark) {
            body, .wrapper { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #111827 100%) !important; }
            .container { background-color: #171726 !important;  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important; }
            h1, h2, h3 { color: #f8fafc !important; }
            p, .announcement-body { color: #cbd5e1 !important; }
            .badge { background: rgba(34, 197, 94, 0.15) !important; color: #4ade80 !important; border-color: rgba(34, 197, 94, 0.3) !important; }
            .announcement-card { background: rgba(255, 255, 255, 0.03) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
            .info-card { background: rgba(255, 255, 255, 0.03) !important; border-color: rgba(255, 255, 255, 0.08) !important; }
            .info-label { color: #94a3b8 !important; }
            .info-value { color: #f1f5f9 !important; }
            .marks-value { color: #4ade80 !important; }
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
            .info-card-inner { padding: 20px 16px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <!-- Container -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px; box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
                    <tr>
                        <td class="content-padding" style="padding: 48px 44px;">
                            <!-- Logo Section -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td valign="middle" style="padding-right: 14px;">
                                                    <img src="https://RedPanda Learns.ai/logo.png" alt="RedPanda Learns Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
                                                </td>
                                                <td valign="middle">
                                                    <!--[if mso]>
                                                    <span class="logo-text-fallback" style="color: #d946ef; font-size: 24px; font-weight: 800;">RedPanda Learns</span>
                                                    <![endif]-->
                                                    <!--[if !mso]><!-->
                                                    <span class="logo-text" style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">RedPanda Learns</span>
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
                                        <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%); color: #16a34a; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(34, 197, 94, 0.15);">
                                            <span style="display: inline-block; width: 6px; height: 6px; background-color: #22c55e; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                                           Re-evaluated
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Title & Intro -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 16px;">
                                        <h2 style="font-size: 26px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">Your Assignment Has Been Re-evaluated</h2>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-bottom: 28px;">
                                        <p style="font-size: 16px; color: #4a4a5a; line-height: 1.6; margin: 0; max-width: 400px;">
                                            Hi <strong>${userName}</strong>,<br /><br />
                                            Your assignment submission has been carefully re-evaluated. Below are the updated results based on the latest review:
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Assignment Info Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="info-card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.15); margin-bottom: 20px;">
                                <tr>
                                    <td class="info-card-inner" style="padding: 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <!-- Assignment Title Row -->
                                            <tr>
                                                <td style="padding-bottom: 16px; border-bottom: 1px solid rgba(99, 102, 241, 0.1);">
                                                    <p class="info-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Assignment</p>
                                                    <p class="info-value" style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; line-height: 1.4;">${assignmentTitle}</p>
                                                </td>
                                            </tr>
                                            <!-- Marks Row -->
                                            <tr>
                                                <td style="padding-top: 16px;">
                                                    <p class="info-label" style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">Updated Marks</p>
                                                    <p class="marks-value" style="font-size: 32px; font-weight: 800; color: #16a34a; margin: 0; line-height: 1.2;">${marks}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Main Action Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(34, 174, 209, 0.04) 50%, rgba(242, 178, 73, 0.04) 100%); border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.12);">
                                <tr>
                                    <td align="center" style="padding: 36px 24px;">
                                        <p style="font-size: 15px; color: #4a4a5a; margin: 0 0 20px 0;">Click below to review the updated feedback and results:
:</p>
                                        <!-- Button -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="border-radius: 12px; background: #d946ef;">
                                                    <a href="${evalLink}" class="btn-primary" style="background: linear-gradient(135deg, #d946ef 0%, #3b82f6 100%); color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block; border: 0;">
                                                        View Updated Results
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

                            <!-- Encouragement Message -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                                <tr>
                                    <td align="center">
                                        <p style="font-size: 14px; color: #6a6a7a; line-height: 1.6; margin: 0; max-width: 380px;">
                                          Thank you for your patience, ${userName}. We appreciate your commitment to improving and learning.
                                        </p>
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
                                            Made with <span style="color: #d946ef;">&#9829;</span> by the <span style="font-weight: 700; color: #d946ef;">RedPanda Learns</span> Team
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
</html>`;
}
