import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";

/**
 * Subscribes an email to the newsletter.
 * Uses the normalized email as the document ID for idempotency.
 */
export async function subscribeToNewsletter(
  email: string
): Promise<{ success: boolean; message: string }> {
  if (!db) return { success: false, message: "Firebase is not configured." };

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const ref = doc(db, "NewsletterSubscribers", normalizedEmail);

    const existing = await getDoc(ref);
    if (existing.exists()) {
      return { success: true, message: "Already subscribed!" };
    }

    await setDoc(ref, {
      email: normalizedEmail,
      subscribedAt: serverTimestamp(),
      source: "landing_page",
    });

    return { success: true, message: "Subscribed!" };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to subscribe to newsletter";
    return { success: false, message };
  }
}
