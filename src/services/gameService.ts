// src/services/gameService.ts — fetch the daily mini-game and report completion.

import { BACKEND_URL } from "@/config";
import { parseGame, type Game } from "@/lib/gameSchema";
import { authService } from "./authService";
import { logError } from "@/utils/logger";

class GameService {
  /** Fetch today's game (optionally for a specific engine). Returns null on any failure. */
  async getDailyGame(engine?: Game["engine"]): Promise<Game | null> {
    try {
      const idToken = await authService.getToken();
      if (!idToken) return null;
      const url = new URL(`${BACKEND_URL}/getGame`);
      if (engine) url.searchParams.set("engine", engine);

      const resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!resp.ok) return null;

      // Defensive: validate against the shared schema before rendering.
      return parseGame(await resp.json());
    } catch (err) {
      logError("GameService.getDailyGame", err);
      return null;
    }
  }

  /** Report a finished game. `won` gates the karma award (once per user per day, server-side). */
  async completeGame(won: boolean, userName?: string): Promise<number> {
    try {
      const idToken = await authService.getToken();
      if (!idToken) return 0;
      const resp = await fetch(`${BACKEND_URL}/completeGame`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ won, userName }),
      });
      if (!resp.ok) return 0;
      const data = (await resp.json()) as { karmaAwarded?: number };
      return data.karmaAwarded ?? 0;
    } catch (err) {
      logError("GameService.completeGame", err);
      return 0;
    }
  }
}

export const gameService = new GameService();
