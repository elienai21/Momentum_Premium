import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/global.css";
import { TenantProvider } from "./context/TenantContext";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TenantProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TenantProvider>
  </React.StrictMode>
);
