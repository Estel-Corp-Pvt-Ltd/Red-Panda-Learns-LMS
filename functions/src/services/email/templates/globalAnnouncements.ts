export const buildGlobalNotificationEmail = (
  title: string,
  body: string
): string => {
return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
    <title>Announcement</title>
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
      /* Reset */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body, table, td, p, a, li {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }

      table, td {
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        border-collapse: collapse;
      }

      img {
        -ms-interpolation-mode: bicubic;
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        -webkit-font-smoothing: antialiased;
      }

      .wrapper {
        width: 100%;
        background: linear-gradient(135deg, 
          hsl(300, 100%, 95%) 0%, 
          hsl(280, 80%, 92%) 25%,
          hsl(198, 75%, 92%) 50%,
          hsl(36, 95%, 92%) 100%
        );
      }

      .container {
        max-width: 540px;
        margin: 0 auto;
        background-color: rgba(255, 255, 255, 0.9);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.9);
      }

      .logo-text {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.5px;
      }

      /* Fallback for email clients that don't support gradient text */
      .logo-text-fallback {
        color: #d946ef;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .badge {
        display: inline-block;
        background: linear-gradient(135deg, 
          rgba(255, 0, 255, 0.12) 0%, 
          rgba(34, 174, 209, 0.12) 100%
        );
        color: #a21caf;
        font-size: 11px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 50px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(255, 0, 255, 0.15);
      }

      .badge-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        background-color: #d946ef;
        border-radius: 50%;
        margin-right: 6px;
        vertical-align: middle;
      }

      h2 {
        font-size: 28px;
        font-weight: 800;
        color: #1a1a2e;
        letter-spacing: -0.5px;
        line-height: 1.2;
        margin: 0;
      }

      .announcement-card {
        background: linear-gradient(135deg, 
          rgba(255, 0, 255, 0.06) 0%, 
          rgba(34, 174, 209, 0.06) 50%,
          rgba(242, 178, 73, 0.06) 100%
        );
        border-radius: 16px;
        border: 1px solid rgba(255, 0, 255, 0.12);
        border-left: 4px solid #d946ef;
      }

      .announcement-body {
        font-size: 15px;
        color: #4a4a5a;
        line-height: 1.75;
      }

      .divider {
        height: 1px;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255, 0, 255, 0.2) 20%,
          rgba(34, 174, 209, 0.2) 50%,
          rgba(242, 178, 73, 0.2) 80%,
          transparent 100%
        );
      }

      .footer-text {
        font-size: 14px;
        color: #6a6a7a;
        font-weight: 500;
      }

      .footer-heart {
        color: #d946ef;
      }

      .footer-brand {
        font-weight: 700;
        color: #d946ef;
      }

      .footer-link {
        font-size: 13px;
        color: #8a8a9a;
        text-decoration: none;
        font-weight: 500;
      }

      .footer-link:hover {
        color: #d946ef;
      }

      .dot-separator {
        color: #8a8a9a;
        font-size: 8px;
        vertical-align: middle;
        padding: 0 10px;
      }

      /* Mobile Styles */
      @media only screen and (max-width: 600px) {
        .wrapper {
          padding: 24px 12px !important;
        }

        .container {
          border-radius: 20px !important;
        }

        .content-padding {
          padding: 32px 24px !important;
        }

        .logo-img {
          width: 40px !important;
          height: 40px !important;
        }

        .logo-text, .logo-text-fallback {
          font-size: 20px !important;
        }

        h2 {
          font-size: 22px !important;
        }

        .announcement-card {
          border-radius: 12px !important;
        }

        .card-padding {
          padding: 18px 20px !important;
        }

        .announcement-body {
          font-size: 14px !important;
        }
      }
    </style>
  </head>

  <body style="margin: 0; padding: 0;">
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background: linear-gradient(135deg, hsl(300, 100%, 95%) 0%, hsl(280, 80%, 92%) 25%, hsl(198, 75%, 92%) 50%, hsl(36, 95%, 92%) 100%);">
      <tr>
        <td align="center" style="padding: 48px 16px;">
          
          <!-- Container -->
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width: 540px; width: 100%; background-color: rgba(255, 255, 255, 0.95); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 8px 32px rgba(255, 0, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);">
            <tr>
              <td class="content-padding" style="padding: 48px 44px;">
                
                <!-- Logo Section -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 28px; border-bottom: 1px solid rgba(255, 0, 255, 0.12);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 14px;">
                            <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" width="48" height="48" class="logo-img" style="display: block; width: 48px; height: 48px; object-fit: contain;" />
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
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="28" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>

                <!-- Badge -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <span class="badge" style="display: inline-block; background: linear-gradient(135deg, rgba(255, 0, 255, 0.12) 0%, rgba(34, 174, 209, 0.12) 100%); color: #a21caf; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(255, 0, 255, 0.15);">
                        <span class="badge-dot" style="display: inline-block; width: 6px; height: 6px; background-color: #d946ef; border-radius: 50%; margin-right: 6px; vertical-align: middle;"></span>
                        Announcement
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Title -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h2 style="font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; line-height: 1.2; margin: 0;">${title}</h2>
                    </td>
                  </tr>
                </table>

                <!-- Announcement Card -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="announcement-card" style="background: linear-gradient(135deg, rgba(255, 0, 255, 0.06) 0%, rgba(34, 174, 209, 0.06) 50%, rgba(242, 178, 73, 0.06) 100%); border-radius: 16px; border: 1px solid rgba(255, 0, 255, 0.12); border-left: 4px solid #d946ef;">
                        <tr>
                          <td class="card-padding" style="padding: 24px 28px;">
                            <p class="announcement-body" style="font-size: 15px; color: #4a4a5a; line-height: 1.75; margin: 0; white-space: pre-wrap;">${body}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Spacer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="36" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>

                <!-- Divider -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255, 0, 255, 0.2) 20%, rgba(34, 174, 209, 0.2) 50%, rgba(242, 178, 73, 0.2) 80%, transparent 100%);"></td>
                  </tr>
                </table>

                <!-- Spacer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td height="36" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <p class="footer-text" style="font-size: 14px; color: #6a6a7a; font-weight: 500; margin: 0;">
                        Made with <span class="footer-heart" style="color: #d946ef;">♥</span> by the <span class="footer-brand" style="font-weight: 700; color: #d946ef;">Vizuara</span> Team
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td height="18" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <a href="https://vizuara.ai" class="footer-link" style="font-size: 13px; color: #8a8a9a; text-decoration: none; font-weight: 500;">Website</a>
                          </td>
                          <td>
                            <span class="dot-separator" style="color: #8a8a9a; font-size: 10px; padding: 0 12px;">•</span>
                          </td>
                          <td>
                            <a href="https://vizuara.ai/privacy" class="footer-link" style="font-size: 13px; color: #8a8a9a; text-decoration: none; font-weight: 500;">Privacy</a>
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
