import { createRoot } from "react-dom/client";

// Inline critical CSS and render immediately
const root = createRoot(document.getElementById("root")!);

// Import CSS asynchronously for faster FCP
import("./index.css");

// Render App immediately - no StrictMode for maximum speed
import("./App.tsx").then(({ default: App }) => {
  root.render(<App />);
});