import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import { decodeShare } from "./share";

async function start() {
  const shared = await decodeShare(window.location.hash);
  if (shared)
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App shared={shared} />
    </React.StrictMode>,
  );
}
void start();
