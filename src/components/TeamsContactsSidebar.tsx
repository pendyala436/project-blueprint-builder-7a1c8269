import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  MessageCircle, 
  Video, 
  Search, 
  Users, 
  ChevronLeft,
  ChevronRight,
  Circle
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

interface ActiveChat {
  id: string;
  chatId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  partnerLanguage: string;
  isPartnerOnline: boolean;
  ratePerMinute: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface TeamsContactsSidebarProps {
  currentUserId: string;
  userGender: "male" | "female";
  activeChats: ActiveChat[];
  selectedChatId: string | null;
  onSelectChat: (chat: ActiveChat) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function TeamsContactsSidebar({
  currentUserId,
  userGender,
  activeChats,
  selectedChatId,
  onSelectChat,
  isCollapsed,
  onToggleCollapse
}: TeamsContactsSidebarProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChats, setFilteredChats] = useState<ActiveChat[]>(activeChats);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredChats(
        activeChats.filter(chat =>
          chat.partnerName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredChats(activeChats);
    }
  }, [searchQuery, activeChats]);

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? "bg-online" : "bg-muted-foreground";
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-muted/30 border-r flex flex-col items-center py-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="mb-4"
          onClick={onToggleCollapse}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {filteredChats.map((chat) => (
          <Button
            key={chat.chatId}
            variant={selectedChatId === chat.chatId ? "secondary" : "ghost"}
            size="icon"
            className="relative"
            onClick={() => onSelectChat(chat)}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={chat.partnerPhoto || undefined} />
              <AvatarFallback className="text-xs">
                {chat.partnerName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
              getStatusColor(chat.isPartnerOnline)
            )} />
            {(chat.unreadCount || 0) > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px]"
                variant="destructive"
              >
                {chat.unreadCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-72 bg-muted/30 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{t('chats', 'Chats')}</h3>
          {activeChats.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeChats.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapse}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchChats', 'Search chats...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noActiveChats', 'No active chats')}</p>
              <p className="text-xs mt-1">
                {userGender === "male" 
                  ? t('startChattingWithWomen', 'Start chatting with women online')
                  : t('waitForIncomingChats', 'Wait for incoming chat requests')}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.chatId}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                  selectedChatId === chat.chatId
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectChat(chat)}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={chat.partnerPhoto || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {chat.partnerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                    getStatusColor(chat.isPartnerOnline)
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{chat.partnerName}</p>
                    {chat.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.lastMessageTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessage || chat.partnerLanguage}
                    </p>
                    {(chat.unreadCount || 0) > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-[20px] px-1.5 text-xs flex-shrink-0"
                      >
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer - Chat Count */}
      {activeChats.length > 0 && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('activeChats', 'Active Chats')}</span>
            <span className={cn(
              "font-medium",
              activeChats.length >= 3 ? "text-destructive" : "text-foreground"
            )}>
              {activeChats.length}/3
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsContactsSidebar;
