import { useEffect } from "react";

/**
 * Deters casual access to dev tools / page source while viewing lesson content.
 *
 * NOTE: This is a deterrent, not real security — a determined user can still
 * reach the content URLs (e.g. via the network tab before this mounts, or by
 * disabling JS). Treat it as friction, not protection. Real protection must
 * happen server-side (signed/expiring URLs, DRM, etc.).
 *
 * Disables:
 *  - Right-click context menu
 *  - F12
 *  - Ctrl/Cmd+Shift+I / J / C / K (inspector, console, picker)
 *  - Ctrl/Cmd+U (view source)
 *  - Ctrl/Cmd+S (save page)
 *
 * @param enabled toggle the protection on/off (e.g. disable for admins)
 */
export function useContentProtection(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // F12 — open dev tools
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd+Shift+I/J/C/K — inspector, console, element picker
      if (ctrlOrMeta && e.shiftKey && ["i", "j", "c", "k"].includes(key)) {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd+U — view source
      // Ctrl/Cmd+S — save page
      if (ctrlOrMeta && ["u", "s"].includes(key)) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [enabled]);
}
