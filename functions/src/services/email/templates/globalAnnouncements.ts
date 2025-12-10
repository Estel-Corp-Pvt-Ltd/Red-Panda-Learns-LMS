export const buildGlobalNotificationEmail = (
  title: string,
  body: string
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Announcement</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body, html {
        font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .wrapper {
        width: 100%;
        min-height: 100vh;
        padding: 48px 16px;
        background: linear-gradient(135deg, 
          hsl(300, 100%, 95%) 0%, 
          hsl(280, 80%, 92%) 25%,
          hsl(198, 75%, 92%) 50%,
          hsl(36, 95%, 92%) 100%
        );
        background-attachment: fixed;
      }

      .container {
        max-width: 540px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 48px 44px;
        border: 1px solid rgba(255, 255, 255, 0.9);
        box-shadow: 
          0 8px 32px rgba(255, 0, 255, 0.08),
          0 2px 8px rgba(0, 0, 0, 0.04),
          inset 0 1px 1px rgba(255, 255, 255, 0.9);
      }

      .logo-section {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-bottom: 36px;
        padding-bottom: 28px;
        border-bottom: 1px solid rgba(255, 0, 255, 0.12);
      }

      .logo-section img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        filter: drop-shadow(0 2px 8px rgba(255, 0, 255, 0.2));
      }

      .logo-text {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: -0.03em;
      }

      .badge-wrapper {
        text-align: center;
        margin-bottom: 20px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, 
          rgba(255, 0, 255, 0.12) 0%, 
          rgba(34, 174, 209, 0.12) 100%
        );
        color: hsl(300, 100%, 40%);
        font-size: 11px;
        font-weight: 700;
        padding: 8px 16px;
        border-radius: 50px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border: 1px solid rgba(255, 0, 255, 0.15);
      }

      .badge-dot {
        width: 6px;
        height: 6px;
        background: hsl(300, 100%, 50%);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.1); }
      }

      h2 {
        font-size: 28px;
        font-weight: 800;
        text-align: center;
        color: #1a1a2e;
        letter-spacing: -0.03em;
        margin-bottom: 28px;
        line-height: 1.2;
      }

      .announcement-card {
        position: relative;
        margin: 24px 0;
        padding: 24px 28px;
        background: linear-gradient(135deg, 
          rgba(255, 0, 255, 0.06) 0%, 
          rgba(34, 174, 209, 0.06) 50%,
          rgba(242, 178, 73, 0.06) 100%
        );
        border-radius: 16px;
        border: 1px solid rgba(255, 0, 255, 0.12);
        overflow: hidden;
      }

      .announcement-card::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, 
          hsl(300, 100%, 50%) 0%, 
          hsl(198, 75%, 52%) 50%,
          hsl(36, 95%, 61%) 100%
        );
        border-radius: 4px 0 0 4px;
      }

      .announcement-title {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 12px;
        line-height: 1.4;
      }

      .announcement-body {
        font-size: 15px;
        color: #4a4a5a;
        line-height: 1.75;
        white-space: pre-wrap;
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
        margin: 36px 0;
        border: none;
      }

      .footer {
        text-align: center;
      }

      .footer-text {
        font-size: 14px;
        color: #6a6a7a;
        font-weight: 500;
      }

      .footer-heart {
        display: inline-block;
        color: hsl(300, 100%, 50%);
        animation: heartbeat 1.5s infinite;
      }

      @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }

      .footer-brand {
        font-weight: 700;
        background: linear-gradient(135deg, hsl(300, 100%, 50%) 0%, hsl(198, 75%, 52%) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .footer-links {
        margin-top: 18px;
        display: flex;
        justify-content: center;
        gap: 24px;
      }

      .footer-links a {
        font-size: 13px;
        color: #8a8a9a;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s ease;
        position: relative;
      }

      .footer-links a::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, hsl(300, 100%, 50%), hsl(198, 75%, 52%));
        transition: width 0.2s ease;
      }

      .footer-links a:hover {
        color: hsl(300, 100%, 45%);
      }

      .footer-links a:hover::after {
        width: 100%;
      }

      @media only screen and (max-width: 600px) {
        .wrapper {
          padding: 32px 14px;
        }

        .container {
          padding: 36px 28px;
          border-radius: 20px;
        }

        .logo-section {
          gap: 12px;
          margin-bottom: 28px;
          padding-bottom: 24px;
        }

        .logo-section img {
          width: 42px;
          height: 42px;
        }

        .logo-text {
          font-size: 20px;
        }

        h2 {
          font-size: 24px;
        }

        .announcement-card {
          padding: 20px 22px;
          border-radius: 12px;
        }

        .announcement-title {
          font-size: 16px;
        }

        .announcement-body {
          font-size: 14px;
        }

        .footer-links {
          gap: 20px;
        }
      }

      @media screen and (max-width: 480px) {
        .container {
          padding: 28px 20px !important;
        }
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      <div class="container">

        <!-- Logo -->
        <div class="logo-section">
          <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" />
          <span class="logo-text">Vizuara AI Labs</span>
        </div>
<!-- Badge -->
<div class="badge-wrapper">
  <span class="badge">
    <span class="badge-dot"></span>
    Announcement
  </span>
</div>

<!-- Title as Header -->
<h2>${title}</h2>

<!-- Announcement Body -->
<div class="announcement-card">
  <div class="announcement-body">${body}</div>
</div>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Footer -->
        <div class="footer">
          <p class="footer-text">
            Made with <span class="footer-heart">♥</span> by the <span class="footer-brand">Vizuara</span> Team
          </p>
          <div class="footer-links">
            <a href="https://vizuara.ai">Website</a>
            <a href="https://vizuara.ai/privacy">Privacy</a>
          </div>
        </div>

      </div>
    </div>
  </body>
</html>
  `;
};
