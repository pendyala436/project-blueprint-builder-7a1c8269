import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  PhoneOff,
  ArrowLeft,
  Circle,
  Languages,
  Loader2,
  MessageCircle,
  RefreshCw,
  User,
  Clock,
  IndianRupee
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { isIndianLanguage } from "@/data/nllb200Languages";

interface MatchableWoman {
  userId: string;
  fullName: string;
  age: number | null;
  photoUrl: string | null;
  motherTongue: string;
  country: string | null;
  isOnline: boolean;
  isBusy: boolean;
  currentChatCount: number;
  isIndian: boolean; // Used for fallback matching priority
}

const MatchingScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [matchableWomen, setMatchableWomen] = useState<MatchableWoman[]>([]);
  const [currentUserLanguage, setCurrentUserLanguage] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedWoman, setSelectedWoman] = useState<MatchableWoman | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "searching" | "connecting" | "connected" | "reconnecting">("idle");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    loadMatchableWomen();
    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup();
    };
  }, []);

  const setupRealtimeSubscription = () => {
    const statusChannel = supabase
      .channel('women-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status'
        },
        () => {
          loadMatchableWomen();
        }
      )
      .subscribe();

    const availabilityChannel = supabase
      .channel('women-availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'women_availability'
        },
        () => {
          loadMatchableWomen();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(availabilityChannel);
    };
  };

  const loadMatchableWomen = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUserId(user.id);

      // Get current user's profile and mother tongue
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("gender, primary_language, preferred_language")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentProfile?.gender !== "Male") {
        toast({
          title: "Access Denied",
          description: "This feature is only available for male users",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Get user's languages (mother tongue)
      const { data: userLanguages } = await supabase
        .from("user_languages")
        .select("language_name")
        .eq("user_id", user.id)
        .limit(1);

      const motherTongue = userLanguages?.[0]?.language_name || 
                          currentProfile?.primary_language || 
                          currentProfile?.preferred_language || 
                          "English";
      
      setCurrentUserLanguage(motherTongue);

      // Fetch online women
      const { data: onlineStatus } = await supabase
        .from("user_status")
        .select("user_id, is_online")
        .eq("is_online", true);

      const onlineUserIds = onlineStatus?.map(s => s.user_id) || [];

      if (onlineUserIds.length === 0) {
        setMatchableWomen([]);
        setIsLoading(false);
        return;
      }

      // Fetch female profiles with country info
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url, age, primary_language, preferred_language, country")
        .eq("gender", "Female")
        .in("user_id", onlineUserIds);

      // Fetch availability status
      const { data: availability } = await supabase
        .from("women_availability")
        .select("user_id, is_available, current_chat_count, max_concurrent_chats")
        .in("user_id", onlineUserIds);

      const availabilityMap = new Map(
        availability?.map(a => [a.user_id, a]) || []
      );

      // Fetch languages for each user
      const women: MatchableWoman[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: languages } = await supabase
            .from("user_languages")
            .select("language_name")
            .eq("user_id", profile.user_id)
            .limit(1);

          const womanLanguage = languages?.[0]?.language_name || 
                               profile.primary_language || 
                               profile.preferred_language || 
                               "Unknown";

          const avail = availabilityMap.get(profile.user_id);
          const isBusy = avail ? avail.current_chat_count >= avail.max_concurrent_chats : false;
          const isIndian = profile.country?.toLowerCase() === "india";

          return {
            userId: profile.user_id,
            fullName: profile.full_name || "Anonymous",
            age: profile.age,
            photoUrl: profile.photo_url,
            motherTongue: womanLanguage,
            country: profile.country,
            isOnline: true,
            isBusy,
            currentChatCount: avail?.current_chat_count || 0,
            isIndian, // Used for fallback matching priority
          };
        })
      );

      // Sort: same language first, then by availability (free first)
      const sortedWomen = women.sort((a, b) => {
        const aMatch = a.motherTongue.toLowerCase() === motherTongue.toLowerCase() ? 0 : 1;
        const bMatch = b.motherTongue.toLowerCase() === motherTongue.toLowerCase() ? 0 : 1;
        
        if (aMatch !== bMatch) return aMatch - bMatch;
        if (a.isBusy !== b.isBusy) return a.isBusy ? 1 : -1;
        return a.currentChatCount - b.currentChatCount;
      });

      setMatchableWomen(sortedWomen);
    } catch (error) {
      console.error("Error loading matchable women:", error);
      toast({
        title: "Error",
        description: "Failed to load available users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const findNextAvailableWoman = useCallback(async (excludeUserId?: string): Promise<MatchableWoman | null> => {
    const availableWomen = matchableWomen.filter(w => 
      !w.isBusy && 
      w.isOnline && 
      w.userId !== excludeUserId
    );

    // Priority 1: Same language women
    const sameLanguageWomen = availableWomen.filter(
      w => w.motherTongue.toLowerCase() === currentUserLanguage.toLowerCase()
    );

    if (sameLanguageWomen.length > 0) {
      return sameLanguageWomen[0];
    }

    // Priority 2: If no same language women, fallback to Indian women
    const indianWomen = availableWomen.filter(w => w.isIndian);
    if (indianWomen.length > 0) {
      return indianWomen[0];
    }

    // Priority 3: Any available woman
    return availableWomen[0] || null;
  }, [matchableWomen, currentUserLanguage]);

  const initiateChat = async (woman: MatchableWoman) => {
    if (!currentUserId) return;

    setIsConnecting(true);
    setConnectionStatus("connecting");
    setSelectedWoman(woman);

    try {
      // Check wallet balance first
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!wallet || wallet.balance <= 0) {
        toast({
          title: "Insufficient Balance",
          description: "Please recharge your wallet to start chatting",
          variant: "destructive",
        });
        navigate("/wallet");
        return;
      }

      // Start chat via edge function
      const { data, error } = await supabase.functions.invoke("chat-manager", {
        body: {
          action: "start_chat",
          man_user_id: currentUserId,
          woman_user_id: woman.userId,
          preferred_language: currentUserLanguage
        }
      });

      if (error) throw error;

      if (data?.success) {
        setActiveChatId(data.chat_id);
        setConnectionStatus("connected");
        toast({
          title: "Connected!",
          description: `You're now chatting with ${woman.fullName}`,
        });
        
        // Navigate to chat screen
        navigate(`/chat/${woman.userId}`);
      } else if (data?.message === "Insufficient balance") {
        toast({
          title: "Insufficient Balance",
          description: "Please recharge to continue",
          variant: "destructive",
        });
        navigate("/wallet");
      } else {
        // Woman might be busy, try next available
        await handleAutoConnect(woman.userId);
      }
    } catch (error) {
      console.error("Error initiating chat:", error);
      // Try to connect to next available woman
      await handleAutoConnect(woman.userId);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAutoConnect = async (excludeUserId?: string) => {
    setConnectionStatus("searching");
    
    const nextWoman = await findNextAvailableWoman(excludeUserId);
    
    if (nextWoman) {
      toast({
        title: "Finding available user...",
        description: `Connecting to ${nextWoman.fullName}`,
      });
      await initiateChat(nextWoman);
    } else {
      setConnectionStatus("idle");
      toast({
        title: "No one available",
        description: "All users are currently busy. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleReconnect = async () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast({
        title: "Connection failed",
        description: "Unable to find available users. Please try again later.",
        variant: "destructive",
      });
      setConnectionStatus("idle");
      reconnectAttempts.current = 0;
      return;
    }

    reconnectAttempts.current += 1;
    setConnectionStatus("reconnecting");
    
    await loadMatchableWomen();
    await handleAutoConnect(selectedWoman?.userId);
  };

  const handleQuickConnect = async () => {
    const availableWoman = await findNextAvailableWoman();
    
    if (availableWoman) {
      await initiateChat(availableWoman);
    } else {
      toast({
        title: "No one available",
        description: "No users are currently online with matching language",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Finding users who speak {currentUserLanguage}...</p>
        </div>
      </div>
    );
  }

  const sameLanguageWomen = matchableWomen.filter(
    w => w.motherTongue.toLowerCase() === currentUserLanguage.toLowerCase()
  );
  const otherWomen = matchableWomen.filter(
    w => w.motherTongue.toLowerCase() !== currentUserLanguage.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <MeowLogo size="sm" />
          
          <div className="flex items-center gap-2">
            <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            <span className="text-sm text-muted-foreground">{matchableWomen.length} online</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        {connectionStatus !== "idle" && (
          <Card className="p-4 bg-primary/10 border-primary/30 animate-pulse">
            <div className="flex items-center gap-3">
              {connectionStatus === "searching" && (
                <>
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-foreground">Searching for available users...</span>
                </>
              )}
              {connectionStatus === "connecting" && (
                <>
                  <Phone className="w-5 h-5 text-primary animate-bounce" />
                  <span className="text-foreground">Connecting to {selectedWoman?.fullName}...</span>
                </>
              )}
              {connectionStatus === "reconnecting" && (
                <>
                  <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-foreground">Reconnecting... Attempt {reconnectAttempts.current}/{maxReconnectAttempts}</span>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Quick Connect Button */}
        <Card className="p-6 bg-gradient-to-r from-primary/20 to-rose-500/20 border-primary/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Quick Connect</h2>
              <p className="text-sm text-muted-foreground">
                Auto-connect to the best available match who speaks {currentUserLanguage}
              </p>
            </div>
            <Button 
              variant="gradient" 
              size="lg"
              onClick={handleQuickConnect}
              disabled={isConnecting || matchableWomen.length === 0}
              className="min-w-[150px]"
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Connect Now
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Same Language Users */}
        {sameLanguageWomen.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Speaks {currentUserLanguage}
              </h3>
              <Badge variant="secondary" className="ml-2">
                {sameLanguageWomen.length} available
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sameLanguageWomen.map((woman) => (
                <WomanCard 
                  key={woman.userId}
                  woman={woman}
                  onConnect={() => initiateChat(woman)}
                  onViewProfile={() => navigate(`/profile/${woman.userId}`)}
                  isConnecting={isConnecting && selectedWoman?.userId === woman.userId}
                  isPriority
                />
              ))}
            </div>
          </section>
        )}

        {/* Other Language Users */}
        {otherWomen.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                Other Languages
              </h3>
              <Badge variant="outline" className="ml-2">
                {otherWomen.length} online
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherWomen.map((woman) => (
                <WomanCard 
                  key={woman.userId}
                  woman={woman}
                  onConnect={() => initiateChat(woman)}
                  onViewProfile={() => navigate(`/profile/${woman.userId}`)}
                  isConnecting={isConnecting && selectedWoman?.userId === woman.userId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {matchableWomen.length === 0 && (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <PhoneOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No one online right now</h2>
            <p className="text-muted-foreground mb-6">
              Check back later to find users who speak {currentUserLanguage}
            </p>
            <Button variant="gradient" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

interface WomanCardProps {
  woman: MatchableWoman;
  onConnect: () => void;
  onViewProfile: () => void;
  isConnecting: boolean;
  isPriority?: boolean;
}

const WomanCard = ({ woman, onConnect, onViewProfile, isConnecting, isPriority }: WomanCardProps) => {
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg ${
      isPriority ? "ring-2 ring-primary/50" : ""
    } ${woman.isBusy ? "opacity-70" : ""}`}>
      {/* Photo */}
      <div 
        className="relative aspect-[4/3] bg-muted cursor-pointer"
        onClick={onViewProfile}
      >
        {woman.photoUrl ? (
          <img 
            src={woman.photoUrl} 
            alt={woman.fullName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-rose-500/20">
            <span className="text-4xl font-bold text-primary/50">
              {woman.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
            <Circle className={`w-2 h-2 ${woman.isBusy ? "fill-amber-500 text-amber-500" : "fill-emerald-500 text-emerald-500"} animate-pulse`} />
            <span className="text-xs font-medium text-foreground">
              {woman.isBusy ? "Busy" : "Free"}
            </span>
          </div>
          {isPriority && (
            <div className="px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium text-center">
              Same Language
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
            <IndianRupee className="w-3 h-3" />
            <span>Earns</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-foreground truncate">{woman.fullName}</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {woman.age && <span>{woman.age} yrs</span>}
            <span>•</span>
            <div className="flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />
              <span>{woman.motherTongue}</span>
            </div>
            {woman.country && (
              <>
                <span>•</span>
                <span>{woman.country}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant={woman.isBusy ? "outline" : "gradient"}
            size="sm"
            className="flex-1"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : woman.isBusy ? (
              <>
                <Clock className="w-4 h-4 mr-1" />
                Queue
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewProfile}
          >
            <User className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MatchingScreen;
