import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registered only so Chrome/Edge/Android will offer "Install app" — the
// service worker itself does no caching, see public/sw.js.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a nice-to-have; failing quietly here shouldn't
      // block the app from loading.
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
