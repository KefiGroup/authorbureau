// build-marker: v3.2-2026-04-20-force-refetch (cache-bust)
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme preference — default to light mode
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
