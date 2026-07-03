import { authService } from "./authService";
import { fail, ok, Result } from "@/utils/response";
import { logError } from "@/utils/logger";

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

class StreakService {
  private backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  /** Current + longest streak for the signed-in user (server-computed). */
  async getStreak(): Promise<Result<Streak>> {
    try {
      const idToken = await authService.getToken();
      const response = await fetch(`${this.backendUrl}/getStreak`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) return fail("Failed to fetch streak.");
      const json = (await response.json()) as { data: Streak };
      return ok(json.data);
    } catch (error) {
      logError("StreakService.getStreak", error);
      return fail("Failed to fetch streak.");
    }
  }
}

export const streakService = new StreakService();
