import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Crown, Languages, MapPin } from "lucide-react";

interface UserContactCardProps {
  name: string;
  photoUrl?: string | null;
  age?: number | null;
  language?: string | null;
  country?: string | null;
  state?: string | null;
  /** Online status indicator */
  isOnline?: boolean;
  /** Active chat count badge (0-3) */
  activeChatCount?: number;
  /** Is premium user (wallet > 0) */
  isPremium?: boolean;
  /** Wallet balance (shown for women viewing men) */
  walletBalance?: number;
  /** Subtitle text (e.g. language info) */
  subtitle?: string;
  /** Right-side action area */
  actions?: React.ReactNode;
  onClick?: () => void;
  /** Double-click handler (e.g. open chat) */
  onDoubleClick?: () => void;
  className?: string;
}

export const UserContactCard: React.FC<UserContactCardProps> = ({
  name,
  photoUrl,
  age,
  language,
  country,
  state,
  isOnline = true,
  activeChatCount,
  isPremium,
  walletBalance,
  subtitle,
  actions,
  onClick,
  onDoubleClick,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer border-b border-border/30 select-none",
        className
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Avatar with status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage src={photoUrl || undefined} alt={name} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Online/busy indicator */}
        {activeChatCount !== undefined ? (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold",
              activeChatCount >= 3
                ? "bg-destructive text-destructive-foreground"
                : activeChatCount > 0
                ? "bg-amber-500 text-white"
                : "bg-online text-online-foreground"
            )}
          >
            {activeChatCount}
          </div>
        ) : isOnline ? (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-online" />
        ) : null}
        {/* Premium crown */}
        {isPremium && (
          <div className="absolute -top-1 -left-1">
            <Crown className="h-3.5 w-3.5 text-primary fill-primary/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-foreground truncate">{name}</span>
          {age && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{age}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          {language && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium">
              {language}
            </span>
          )}
          {(state || country) && (
            <span className="truncate flex items-center gap-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {[state, country].filter(Boolean).join(", ")}
            </span>
          )}
          {walletBalance !== undefined && (
            <span className={cn("font-semibold", walletBalance > 0 ? "text-primary" : "text-muted-foreground")}>
              ₹{Math.round(walletBalance).toLocaleString('en-IN')}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default UserContactCard;
