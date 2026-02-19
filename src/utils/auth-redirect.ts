import { getAuth } from "firebase/auth";

const ALLOWED_REDIRECT_ORIGINS = ["https://pods.vizuara.ai"];

export function getRedirectParam(): string | null {
  return new URLSearchParams(window.location.search).get("redirect");
}

export async function handleAuthRedirect(redirectUrl: string): Promise<boolean> {
  try {
    const url = new URL(redirectUrl);
    if (!ALLOWED_REDIRECT_ORIGINS.includes(url.origin)) return false;

    const currentUser = getAuth().currentUser;
    if (!currentUser) return false;

    const idToken = await currentUser.getIdToken(true);
    url.searchParams.set("token", idToken);
    window.location.href = url.toString();
    return true;
  } catch {
    return false;
  }
}

export function buildAuthLinkWithRedirect(basePath: string, redirectUrl: string | null): string {
  if (!redirectUrl) return basePath;
  return `${basePath}?redirect=${encodeURIComponent(redirectUrl)}`;
}
