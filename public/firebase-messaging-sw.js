importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

let firebaseConfig = null;
let messaging = null;

// console.log("Service Worker: Script loaded successfully");

// Function to initialize Firebase when config is received
const initializeFirebase = () => {
  if (firebaseConfig) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    // console.log("Service Worker: Firebase Messaging initialized successfully");

    // Handle Firebase background messages
    messaging.onBackgroundMessage((payload) => {
      try {
        // console.log("Service Worker: Firebase background message received:", payload);
        const { title, options } = formatNotification(payload);
        self.registration.showNotification(title, options);
      } catch (e) {
        console.error("Service Worker: Error handling background message:", e);
      }
    });
  } else {
    console.error("Service Worker: Firebase config not received yet");
  }
};

// Listen for messages from the main application to pass the Firebase config
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_FIREBASE_CONFIG") {
    firebaseConfig = event.data.payload;
    // console.log("Service Worker: Firebase config received");
    initializeFirebase();
  }
});

// Notification configuration
const NOTIFICATION_CONFIG = {
  colors: {
    primary: "#FF6B35",
    secondary: "#C5007E",
    accent: "#0066CC",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  badge: "/72x72-badge.png",
  icon: "/logo.png",
  placement: "top-right",
  duration: 5000,
  sound: true,
  vibrate: [200, 100, 200],
  actions: [
    { action: "open", title: "Open", icon: "/logo.png" },
    { action: "close", title: "Close", icon: "/logo.png" },
  ],
};

// Format notification with better defaults
function formatNotification(payload) {
  // console.log("Service Worker: Formatting notification:", payload);

  const title =
    payload?.notification?.title || payload?.data?.title || "RedPanda Learns Notification";

  const body = payload?.notification?.body || payload?.data?.body || "";

  const tag =
    payload?.data?.tag ||
    payload?.notification?.tag ||
    "RedPanda Learns-notification-" + Date.now();

  const type = payload?.data?.type || "info";

  let color = NOTIFICATION_CONFIG.colors.primary;
  if (type === "SUCCESS") color = NOTIFICATION_CONFIG.colors.success;
  if (type === "WARNING") color = NOTIFICATION_CONFIG.colors.warning;
  if (type === "ERROR") color = NOTIFICATION_CONFIG.colors.error;
  if (type === "GRADING") color = NOTIFICATION_CONFIG.colors.accent;

  return {
    title,
    options: {
      body,
      tag,
      requireInteraction: type === "error" || type === "grading",
      badge: NOTIFICATION_CONFIG.badge,
      icon: NOTIFICATION_CONFIG.icon,
      image: payload?.notification?.image,
      timestamp: Date.now(),
      data: {
        url: payload?.data?.url || "/",
        type,
        color,
        ...payload?.data,
        ...payload?.notification,
      },
      actions: NOTIFICATION_CONFIG.actions,
      vibrate: NOTIFICATION_CONFIG.vibrate,
      silent: false,
      renotify: true,
    },
  };
}

// Handle standard web push events (non-Firebase)
self.addEventListener("push", (event) => {
  // console.log("Service Worker: Push event received");

  try {
    let payload = {};

    if (event.data) {
      try {
        payload = event.data.json();
        // console.log("Service Worker: Parsed push payload:", payload);
      } catch (e) {
        const textData = event.data.text();
        payload = {
          notification: {
            title: "RedPanda Learns",
            body: textData || "New Notification",
          },
        };
        // console.log("Service Worker: Text push payload:", textData);
      }
    } else {
      // console.log("Service Worker: Push event with no data");
      payload = {
        notification: {
          title: "RedPanda Learns",
          body: "New Notification",
        },
      };
    }

    const { title, options } = formatNotification(payload);

    event.waitUntil(
      self.registration
        .showNotification(title, options)
        .then(() => {
          // console.log("Service Worker: Push notification shown");
        })
        .catch((error) => {
          console.error("Service Worker: Push notification failed:", error);
        })
    );
  } catch (err) {
    // console.error("Service Worker: Error in push event handler:", err);

    event.waitUntil(
      self.registration.showNotification("RedPanda Learns", {
        body: "You have a new notification",
        icon: "/logo.png",
        badge: "/72x72-badge.png",
        vibrate: [200, 100, 200],
      })
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", function (event) {
  // console.log("Service Worker: Notification clicked:", event.notification);

  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            // console.log("Service Worker: Focusing existing window");
            return client.focus();
          }
        }

        if (clients.openWindow) {
          // console.log("Service Worker: Opening new window to:", url);
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener("notificationclose", function (event) {
  // console.log("Service Worker: Notification closed:", event.notification.data);
});

// Test function to verify service worker can show notifications
self.addEventListener("message", (event) => {
  // console.log("Service Worker: Message received:", event.data);

  if (event.data && event.data.type === "TEST_NOTIFICATION") {
    event.waitUntil(
      self.registration.showNotification("Test Notification", {
        body: "Service worker is working!",
        icon: "/logo.png",
        badge: "/72x72-badge.png",
        vibrate: [200, 100, 200],
        data: { url: "/", test: true },
        actions: [
          { action: "open", title: "Open", icon: "/logo.png" },
          { action: "close", title: "Close", icon: "/logo.png" },
        ],
      })
    );
  }
});
