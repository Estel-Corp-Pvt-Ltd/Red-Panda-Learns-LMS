import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { firebaseConfig } from "./firebaseConfig.ts";

// Render app immediately — don't block on SW registration
createRoot(document.getElementById("root")!).render(<App />);

// Register service worker after page load (non-blocking)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((reg) => {
        // Wait for the SW to become active before sending config
        const sw = reg.active || reg.installing || reg.waiting;
        if (sw) {
          if (sw.state === "activated") {
            sw.postMessage({ type: "SET_FIREBASE_CONFIG", payload: firebaseConfig });
          } else {
            sw.addEventListener("statechange", () => {
              if (sw.state === "activated") {
                sw.postMessage({ type: "SET_FIREBASE_CONFIG", payload: firebaseConfig });
              }
            });
          }
        }
      })
      .catch((err) => console.error("SW registration failed:", err));
  });
}
