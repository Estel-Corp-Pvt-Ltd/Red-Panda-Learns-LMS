import { BACKEND_URL } from "@/config";
import { KARMA_CATEGORY, SOCIAL_ACTION } from "@/constants";

/**
 * Service to handle karma for sharing certificates.
 * Awards karma when a user shares a course certificate.
 */
export const calculateKarmaForShareCertificate = {
  /**
   * Fire-and-forget: award karma for sharing a certificate
   */
  awardKarmaForSharing(userId: string, idToken: string, courseId: string, userName: string): void {
    // Silently fail if no token
    if (!idToken) {
      console.warn("[Karma][ShareCertificate] Missing ID token");
      return;
    }


    fetch(`${BACKEND_URL}/addKarma`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId,
        category: KARMA_CATEGORY.SOCIAL,
        action: SOCIAL_ACTION.CERTIFICATE_SHARED,
        courseId,
        userName,
      }),
    }).catch(() => {
      // Intentionally swallow errors (fire-and-forget)
      console.warn("[Karma][ShareCertificate] Failed to award karma");
    });
  },
};
