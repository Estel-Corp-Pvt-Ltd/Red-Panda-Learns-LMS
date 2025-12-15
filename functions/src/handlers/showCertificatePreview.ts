import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { onRequest } from "firebase-functions/https";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { logger } from "firebase-functions";

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const certificatePreviewHandler = async (
    req: Request,
    res: Response
): Promise<void> => {
    if (req.method !== "GET") {
        res.status(405).send("Method not allowed");
        return;
    }

    try {
        const pathParts = req.path.split("/");
        const certificateId = pathParts[pathParts.length - 1];

        if (!certificateId) {
            res.status(400).send("Missing certificate id");
            return;
        }

        const certRef = db.collection("Certificates").doc(certificateId);
        const certSnap = await certRef.get();

        if (!certSnap.exists) {
            res.status(404).send("Certificate not found");
            return;
        }

        const cert = certSnap.data()!;

        const title = `${cert.userName} completed ${cert.courseName}`;
        const description = "Issued by Vizuara AI Labs · Verified Certificate";
        const redirectUrl =
            `https://vizuara.com/certificate/public/view/${certificateId}`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>${title}</title>

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${redirectUrl}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <!-- Redirect humans to the React app -->
  <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
</head>
<body></body>
</html>`;

        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("Cache-Control", "public, max-age=600");
        res.status(200).send(html);
    } catch (error: any) {
        logger.error("❌ Certificate preview error:", error);
        res.status(500).send("Internal server error");
    }
};

export const showCertificatePreview = onRequest(
    {
        region: "us-central1",
    },
    withMiddleware(corsMiddleware, certificatePreviewHandler)
);
