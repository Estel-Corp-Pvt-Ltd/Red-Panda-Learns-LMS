import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { firebaseConfig } from "./firebaseConfig.ts";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js", {
      scope: "/",
    })
    .then((reg) => {
      console.log("Service Worker registered:", reg);
      reg.active?.postMessage({
      type: 'SET_FIREBASE_CONFIG',
      payload: firebaseConfig,
    });
    })
    .catch((err) => console.error("Service Worker registration failed:", err));
}

createRoot(document.getElementById("root")!).render(<App />);
