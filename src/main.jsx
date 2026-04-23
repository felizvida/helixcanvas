import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const serviceWorkerUrl = new URL("sw.js", `${window.location.origin}${baseUrl}`).toString();
      navigator.serviceWorker.register(serviceWorkerUrl, { scope: baseUrl }).catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
