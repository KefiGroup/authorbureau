// build-marker: v3.5-2026-04-20-force-rebuild
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

export const BUILD_TIMESTAMP = "2026-04-20T10:18:00Z";

// Apply saved theme preference — default to light mode
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
