import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Gift, Timer, RefreshCw } from "lucide-react";

interface MenFreeMinutesBadgeProps {
  hasFreeMinutes: boolean;
  freeMinutesRemaining: number;
  freeMinutesTotal: number;
  nextResetDate: string | null;
  isLoading: boolean;
}

const MenFreeMinutesBadge = ({
  hasFreeMinutes,
  freeMinutesRemaining,
  freeMinutesTotal,
  nextResetDate,
  isLoading,
}: MenFreeMinutesBadgeProps) => {
  if (isLoading) return null;

  const formatResetDate = () => {
    if (!nextResetDate) return "";
    const d = new Date(nextResetDate);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Free Chat Time</span>
        </div>
        <Badge
          variant={hasFreeMinutes ? "default" : "secondary"}
          className="text-[10px]"
        >
          {freeMinutesRemaining}/{freeMinutesTotal} min
        </Badge>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            hasFreeMinutes ? "bg-primary" : "bg-muted-foreground/30"
          )}
          style={{
            width: `${Math.min(100, (freeMinutesRemaining / freeMinutesTotal) * 100)}%`,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {hasFreeMinutes ? "No charges during free time" : "Free time used up"}
        </span>
        {nextResetDate && (
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Resets {formatResetDate()}
          </span>
        )}
      </div>
    </Card>
  );
};

export default MenFreeMinutesBadge;
