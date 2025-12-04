import { BACKEND_URL } from "@/config";

export async function sendCouponUsageRequest({
  userId,
  promoCode,
  items,
  idToken,
}: {
  userId: string;
  promoCode: string;
  items: any[];
  idToken: string;
}) {
  try {
    const response = await fetch(
      `${BACKEND_URL}/createCouponUsage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId,
          promoCode,
          items,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Cloud function error",
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Coupon usage request failed:", err);
    return {
      success: false,
      error: err.message || "Unknown error",
    };
  }
}
