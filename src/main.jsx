import React from "react";
import { createRoot } from "react-dom/client";
import { loadLive } from "./data/store.js";
import { I18nProvider } from "./i18n.jsx";
import { ThemeProvider } from "./theme.jsx";
import { AudienceProvider } from "./audience.jsx";
import "./styles.css";

// Fresh data first (short timeout, falls back to the bundle), then the app,
// so graph.js and friends evaluate against the synced values.
loadLive()
  .then(() => import("./App.jsx"))
  .then(({ App }) => {
    createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <ThemeProvider>
          <I18nProvider>
            <AudienceProvider>
              <App />
            </AudienceProvider>
          </I18nProvider>
        </ThemeProvider>
      </React.StrictMode>,
    );
  });

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } else {
    // A worker left over from a production build would serve stale dev modules.
    navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((r) => r.unregister()));
  }
}
