import { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { withMiddleware } from "../middlewares";
import { corsMiddleware } from "../middlewares/cors";
import { authMiddleware } from "../middlewares/auth";
import { karmaRuleService } from "../services/karma/karmaRules";
import { KarmaCategory } from "../types/general";
import { logger } from "firebase-functions";

async function addOrUpdateKarmaRuleHandler(
  req: Request,
  res: Response
) {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { id, category, action, points, enabled } = req.body;
    logger.info("There are request ",req.body)
    if (
      !category ||
      !action ||
      typeof points !== "number" ||
      typeof enabled !== "boolean"
    ) {
      res.status(400).json({
        error:
          "Missing or invalid required fields: category, action, points, enabled",
      });
      return;
    }

    const rule = await karmaRuleService.addOrUpdateRule({
      id,
      category: category as KarmaCategory,
      action,
      points,
      enabled,
    });
    logger.info("this is the result",rule)
    res.status(id ? 200 : 201).json({
      success: true,
      data: rule,
    });
  } catch (error: any) {
    console.error("❌ Add or update karma rule failed:", error);
    res.status(500).json({
      error: "Internal error",
      details: error.message,
    });
  }
}

export const addOrUpdateKarmaRule = onRequest(
  { region: "us-central1" },
  withMiddleware(corsMiddleware, authMiddleware, addOrUpdateKarmaRuleHandler)
);
