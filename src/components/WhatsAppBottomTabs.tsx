import React from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Users, Heart, User, Wallet, Video, Clock } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface WhatsAppBottomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const WhatsAppBottomTabs: React.FC<WhatsAppBottomTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="sticky bottom-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 min-w-[56px] flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-[3px] rounded-b-full bg-primary" />
              )}
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Preset tab configs
export const getMenTabs = (onlineBadge?: number, chatBadge?: number, matchBadge?: number): TabItem[] => [
  { id: "online", label: "Online", icon: <Users className="w-5 h-5" />, badge: onlineBadge },
  { id: "chats", label: "Chats", icon: <MessageCircle className="w-5 h-5" />, badge: chatBadge },
  { id: "history", label: "History", icon: <Clock className="w-5 h-5" /> },
  { id: "groups", label: "Groups", icon: <Video className="w-5 h-5" /> },
  { id: "matches", label: "Matches", icon: <Heart className="w-5 h-5" />, badge: matchBadge },
  { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
];

export const getWomenTabs = (onlineBadge?: number, chatBadge?: number, matchesBadge?: number, earningsBadge?: number): TabItem[] => [
  { id: "online", label: "Online", icon: <Users className="w-5 h-5" />, badge: onlineBadge },
  { id: "chats", label: "Chats", icon: <MessageCircle className="w-5 h-5" />, badge: chatBadge },
  { id: "history", label: "History", icon: <Clock className="w-5 h-5" /> },
  { id: "matches", label: "Matches", icon: <Heart className="w-5 h-5" />, badge: matchesBadge },
  { id: "community", label: "Community", icon: <Users className="w-5 h-5" /> },
  { id: "groups", label: "Groups", icon: <Video className="w-5 h-5" /> },
  { id: "earnings", label: "Earnings", icon: <Wallet className="w-5 h-5" /> },
  { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
];

export default WhatsAppBottomTabs;
