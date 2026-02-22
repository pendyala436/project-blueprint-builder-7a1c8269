import { memo, useCallback, useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DirectionToggle = memo(() => {
  const [isRTL, setIsRTL] = useState(() => {
    return localStorage.getItem("meow_dir") === "rtl" || document.documentElement.dir === "rtl";
  });

  useEffect(() => {
    const dir = isRTL ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    localStorage.setItem("meow_dir", dir);
  }, [isRTL]);

  const toggle = useCallback(() => setIsRTL((prev) => !prev), []);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      className={cn(
        "fixed bottom-20 z-50 h-10 w-10 rounded-full shadow-lg",
        "bg-background/95 backdrop-blur border-border hover:bg-accent",
        isRTL ? "left-4" : "right-4"
      )}
      title={isRTL ? "Switch to LTR" : "Switch to RTL"}
    >
      <ArrowLeftRight className="h-4 w-4" />
    </Button>
  );
});

DirectionToggle.displayName = "DirectionToggle";
export default DirectionToggle;
