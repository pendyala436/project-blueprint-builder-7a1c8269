/**
 * ScrollToggleFab — Floating up/down buttons to jump to top or bottom of page.
 * Both buttons are always visible; smooth scrolls the window.
 */
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const ScrollToggleFab = () => {
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const toBottom = () =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });

  return (
    <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[120] flex flex-col gap-2">
      <Button
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={toTop}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
      <Button
        size="icon"
        className="h-11 w-11 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={toBottom}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ScrollToggleFab;
