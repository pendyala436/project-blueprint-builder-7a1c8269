import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Performance: Use concurrent rendering without StrictMode in production
const root = createRoot(document.getElementById("root")!);

// StrictMode causes double renders in dev - skip in production for speed
if (import.meta.env.DEV) {
  const { StrictMode } = await import("react");
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  root.render(<App />);
}