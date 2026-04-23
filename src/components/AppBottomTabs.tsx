import React from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Users, Heart, User, Wallet, Video, Clock, FileText } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface AppBottomTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const AppBottomTabs: React.FC<AppBottomTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="shrink-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] w-full">
      <div className="flex items-stretch w-full max-w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 basis-0 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-0 relative transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-b-full bg-primary" />
              )}
              <div className="relative shrink-0">
                <span className="[&>svg]:w-[16px] [&>svg]:h-[16px]">{tab.icon}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[8px] leading-none font-medium truncate w-full text-center px-0.5">{tab.label}</span>
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
  { id: "wallet", label: "Wallet", icon: <Wallet className="w-5 h-5" /> },
  { id: "statement", label: "Statement", icon: <FileText className="w-5 h-5" /> },
  { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
];

export const getWomenTabs = (onlineBadge?: number, chatBadge?: number, matchesBadge?: number): TabItem[] => [
  { id: "online", label: "Online", icon: <Users className="w-5 h-5" />, badge: onlineBadge },
  { id: "chats", label: "Chats", icon: <MessageCircle className="w-5 h-5" />, badge: chatBadge },
  { id: "history", label: "History", icon: <Clock className="w-5 h-5" /> },
  { id: "matches", label: "Matches", icon: <Heart className="w-5 h-5" />, badge: matchesBadge },
  { id: "community", label: "Community", icon: <Users className="w-5 h-5" /> },
  { id: "groups", label: "Groups", icon: <Video className="w-5 h-5" /> },
  { id: "wallet", label: "Wallet", icon: <Wallet className="w-5 h-5" /> },
  { id: "statement", label: "Statement", icon: <FileText className="w-5 h-5" /> },
  { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
];

export default AppBottomTabs;
