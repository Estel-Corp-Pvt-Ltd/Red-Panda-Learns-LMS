export const buildCourseAnnouncementEmail = (
  title: string,
  body: string,
  urlSlug: string,
  itemId: string
): string => {
  const isLesson = itemId.toLowerCase().startsWith("lesson");
  const itemType = isLesson ? "Lesson" : "Assignment";

  const link = `https://vizuara.ai/courses/${urlSlug}/${isLesson ? "lesson" : "assignment"}/${itemId}`;

  return `
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${itemType} Added</title>
    <style>
      body, html {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f7f7f9;
        color: #333;
      }

      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        padding: 32px 40px;
        border: 1px solid #e5e5e5;
      }

      .logo-section {
        text-align: center;
        margin-bottom: 24px;
      }

      .logo-section img {
        width: 50px;
      }

      .logo-text {
        font-size: 20px;
        font-weight: bold;
        margin-left: 8px;
        display: inline-block;
        color: #222;
      }

      h2 {
        font-size: 22px;
        margin-bottom: 12px;
        color: #222;
      }

      p {
        font-size: 15px;
        color: #555;
        line-height: 1.6;
      }

      a.btn {
        display: inline-block;
        padding: 14px 24px;
        background-color: #3a7afe;
        color: white;
        text-decoration: none;
        font-weight: 600;
        border-radius: 6px;
        margin-top: 20px;
        font-size: 15px;
      }

      a.btn:hover {
        background-color: #2664e8;
      }

      .link-copy {
        font-size: 14px;
        color: #2b63c6;
        word-break: break-all;
      }

      hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 32px 0;
      }

      .footer {
        text-align: center;
        font-size: 14px;
        color: #777;
      }
    </style>
  </head>

  <body>
    <div class="container">

      <div class="logo-section">
        <img src="https://vizuara.ai/logo.png" alt="Vizuara Logo" />
        <span class="logo-text">Vizuara AI Labs</span>
      </div>

      <h2>New ${itemType} Added!</h2>

      <p><strong>${title}</strong></p>
      <p>${body}</p>

      <p>${itemType} has been added to your course. Click the button below to view it:</p>

      <p style="text-align: center;">
        <a href="${link}" class="btn">View ${itemType}</a>
      </p>

      <p>If the button doesn’t work, here is the direct link:</p>
      <p class="link-copy">${link}</p>

      <hr />

      <div class="footer">
        — The Vizuara Team
      </div>

    </div>
  </body>
</html>
  `;
};
