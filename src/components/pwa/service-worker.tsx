"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** Registers `/sw.js` in production and tells the user when their connection drops or returns. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Registration failures (private mode, blocked storage) only lose offline support.
      });
    }
    const offline = () => toast.warning("You're offline. Some features won't work until you reconnect.", { id: "network" });
    const online = () => toast.success("Back online", { id: "network" });
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}
