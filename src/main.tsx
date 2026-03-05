import { createRoot } from "react-dom/client";

// Inline critical CSS synchronously for fastest FCP
import "./index.css";

// Render immediately - no StrictMode for maximum speed
const root = createRoot(document.getElementById("root")!);

// Load App synchronously to avoid async import overhead (~2ms saved)
import App from "./App";
root.render(<App />);

// Load polyfills in background (non-blocking)
if (typeof window !== 'undefined') {
  requestIdleCallback?.(() => {
    import("./lib/polyfills").then(({ default: loadPolyfills }) => {
      loadPolyfills();
    });
  }) ?? setTimeout(() => {
    import("./lib/polyfills").then(({ default: loadPolyfills }) => {
      loadPolyfills();
    });
  }, 2000);
}