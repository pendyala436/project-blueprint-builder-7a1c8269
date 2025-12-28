import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Load polyfills for older browsers (non-blocking)
import("./lib/polyfills").then(({ default: loadPolyfills }) => {
  loadPolyfills();
});

// Render App immediately
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
