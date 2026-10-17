import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { I18nProvider } from "./i18n.jsx";
import { ThemeProvider } from "./theme.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

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
