import React from "react";
import { cn } from "@/lib/utils";
import MeowLogo from "@/components/MeowLogo";
import { Switch } from "@/components/ui/switch";
import {
  Mail, Shield, BellRing, Users2, Settings, LogOut, FileCheck,
  Search, MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WhatsAppHeaderProps {
  isOnline: boolean;
  onToggleOnline: (checked: boolean) => void;
  onAdminMessages: () => void;
  onAdminChat: () => void;
  onFriends: () => void;
  onSettings: () => void;
  onLogout: () => void;
  unreadNotifications?: number;
  onNotifications?: () => void;
  /** Women-only: show KYC button */
  showKYC?: boolean;
  onKYC?: () => void;
  /** Unread admin message count */
  unreadAdminMessages?: number;
  /** Unread admin chat count */
  unreadAdminChat?: number;
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({
  isOnline,
  onToggleOnline,
  onAdminMessages,
  onAdminChat,
  onFriends,
  onSettings,
  onLogout,
  unreadNotifications = 0,
  onNotifications,
  showKYC,
  onKYC,
  unreadAdminMessages = 0,
  unreadAdminChat = 0,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-primary pt-[env(safe-area-inset-top)]">
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-2">
          <MeowLogo size="sm" />
          <span className="text-base font-bold text-primary-foreground tracking-tight">
            Meow Meow
          </span>
        </div>

        {/* Right: Action icons */}
        <div className="flex items-center gap-1">
          {/* Online toggle */}
          <div className="flex items-center gap-1 mr-1 px-1.5 py-1 rounded-lg bg-primary-foreground/10 flex-shrink-0">
            <Switch
              checked={isOnline}
              onCheckedChange={onToggleOnline}
              className="data-[state=checked]:bg-primary-foreground/30 scale-75"
            />
            <span className="text-[10px] font-medium text-primary-foreground/80">
              {isOnline ? "On" : "Off"}
            </span>
          </div>

          {/* Search / Notifications */}
          {onNotifications && (
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors"
              onClick={onNotifications}
              aria-label="Notifications"
            >
              <BellRing className="w-[18px] h-[18px] text-primary-foreground" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-0.5">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          )}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary-foreground/10 transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="w-[18px] h-[18px] text-primary-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onAdminMessages} className="gap-2">
                <Mail className="w-4 h-4" /> Admin Messages
                {unreadAdminMessages > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadAdminMessages > 99 ? "99+" : unreadAdminMessages}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAdminChat} className="gap-2">
                <Shield className="w-4 h-4" /> Chat with Admin
                {unreadAdminChat > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {unreadAdminChat > 99 ? "99+" : unreadAdminChat}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFriends} className="gap-2">
                <Users2 className="w-4 h-4" /> Friends & Blocked
              </DropdownMenuItem>
              {showKYC && onKYC && (
                <DropdownMenuItem onClick={onKYC} className="gap-2">
                  <FileCheck className="w-4 h-4" /> Bank KYC
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onSettings} className="gap-2">
                <Settings className="w-4 h-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive">
                <LogOut className="w-4 h-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default WhatsAppHeader;
