import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shuffle, MessageCircle, UserCheck, X, Languages, Shield, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isIndianLanguage } from "@/data/profileLanguages";

// Super user email patterns - they bypass balance requirements
const SUPER_USER_PATTERNS = {
  female: /^female([1-9]|1[0-5])@meow-meow\.com$/i,
  male: /^male([1-9]|1[0-5])@meow-meow\.com$/i,
  admin: /^admin([1-9]|1[0-5])@meow-meow\.com$/i,
};

const isSuperUserEmail = (email: string): boolean => {
  if (!email) return false;
  return (
    SUPER_USER_PATTERNS.female.test(email) ||
    SUPER_USER_PATTERNS.male.test(email) ||
    SUPER_USER_PATTERNS.admin.test(email)
  );
};

interface RandomChatButtonProps {
  userGender: "male" | "female";
  userLanguage: string;
  userCountry: string;
  walletBalance?: number;
  variant?: "default" | "gradient" | "hero" | "aurora" | "auroraOutline" | "auroraGhost";
  size?: "default" | "lg" | "sm";
  className?: string;
  onInsufficientBalance?: () => void;
}

export const RandomChatButton = ({
  userGender,
  userLanguage,
  userCountry,
  walletBalance = 0,
  variant = "aurora",
  size = "lg",
  className = "",
  onInsufficientBalance
}: RandomChatButtonProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [searchStatus, setSearchStatus] = useState<string>("");
  const [matchedUser, setMatchedUser] = useState<{
    userId: string;
    fullName: string;
    photoUrl: string | null;
    language: string;
    isSameLanguage: boolean;
    requiresTranslation: boolean;
  } | null>(null);

  const findRandomPartner = async () => {
    // SECURITY: Women cannot initiate chats - they can only respond
    if (userGender === "female") {
      toast({
        title: "Action Not Allowed",
        description: "Women cannot initiate chats. Please wait for men to start a conversation with you.",
        variant: "destructive"
      });
      return;
    }

    // Check wallet balance for men - need at least ₹8 to start chat
    if (userGender === "male") {
      const minBalance = 8; // Minimum balance required to start chat
      
      // Get current user email to check if super user
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';
      
      // Super users (matching email pattern) bypass balance check entirely
      const isSuperUser = /^(female|male|admin)([1-9]|1[0-5])@meow-meow\.com$/i.test(userEmail);
      
      if (!isSuperUser) {
        if (walletBalance <= 0) {
          setRechargeMessage("Your wallet balance is ₹0. Recharge is mandatory to start chatting.");
          setShowRechargeDialog(true);
          onInsufficientBalance?.();
          return;
        } else if (walletBalance < minBalance) {
          setRechargeMessage(`You need at least ₹${minBalance} to start a chat. Your current balance is ₹${walletBalance}. Please recharge your wallet.`);
          setShowRechargeDialog(true);
          onInsufficientBalance?.();
          return;
        }
      }
    }

    setIsSearching(true);
    setSearchDialogOpen(true);
    setSearchStatus("Looking for available partners...");
    setMatchedUser(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to start a chat",
          variant: "destructive"
        });
        setSearchDialogOpen(false);
        return;
      }

      if (userGender === "male") {
        // Men looking for women
        setSearchStatus("Finding an available woman for you...");
        
        // First try language-matched women
        const { data, error } = await supabase.functions.invoke("chat-manager", {
          body: {
            action: "get_available_indian_woman",
            man_user_id: user.id,
            preferred_language: userLanguage,
            man_country: userCountry
          }
        });

        if (error) throw error;

        if (data.success && data.woman_user_id) {
          const womanLanguage = data.profile?.primary_language || userLanguage;
          const isSameLanguage = womanLanguage.toLowerCase() === userLanguage.toLowerCase();
          
          setSearchStatus(isSameLanguage ? "Found a same-language match!" : "Found a match with auto-translation!");
          setMatchedUser({
            userId: data.woman_user_id,
            fullName: data.profile?.full_name || "Anonymous",
            photoUrl: data.profile?.photo_url || null,
            language: womanLanguage,
            isSameLanguage,
            requiresTranslation: !isSameLanguage
          });
        } else {
          // Try general matching
          const { data: generalData, error: generalError } = await supabase.functions.invoke("chat-manager", {
            body: {
              action: "get_available_woman",
              man_user_id: user.id,
              preferred_language: userLanguage
            }
          });

          if (generalError) throw generalError;

          if (generalData.success && generalData.woman_user_id) {
            const womanLanguage = generalData.profile?.primary_language || userLanguage;
            const isSameLanguage = womanLanguage.toLowerCase() === userLanguage.toLowerCase();
            
            setSearchStatus(isSameLanguage ? "Found a same-language match!" : "Found a match with auto-translation!");
            setMatchedUser({
              userId: generalData.woman_user_id,
              fullName: generalData.profile?.full_name || "Anonymous",
              photoUrl: generalData.profile?.photo_url || null,
              language: womanLanguage,
              isSameLanguage,
              requiresTranslation: !isSameLanguage
            });
          } else {
            setSearchStatus("No partners available right now. Please try again later.");
          }
        }
      } else {
        // Women looking for men - find online men with same language
        setSearchStatus("Finding an available man for you...");
        
        // Get online men with matching language
        const { data: onlineStatuses } = await supabase
          .from("user_status")
          .select("user_id")
          .eq("is_online", true);

        if (!onlineStatuses || onlineStatuses.length === 0) {
          setSearchStatus("No men online right now. Please try again later.");
          return;
        }

        const onlineUserIds = onlineStatuses.map(s => s.user_id);

        // Get men profiles
        const { data: menProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, photo_url, primary_language, preferred_language")
          .in("user_id", onlineUserIds)
          .or("gender.eq.male,gender.eq.Male");

        if (!menProfiles || menProfiles.length === 0) {
          setSearchStatus("No men available right now. Please try again later.");
          return;
        }

        // Get languages for the men
        const { data: userLanguages } = await supabase
          .from("user_languages")
          .select("user_id, language_name")
          .in("user_id", menProfiles.map(p => p.user_id));

        const languageMap = new Map(userLanguages?.map(l => [l.user_id, l.language_name]) || []);

        // Find men with same language first, then any online man
        const sameLanguageMen = menProfiles.filter(m => {
          const manLang = languageMap.get(m.user_id) || m.primary_language || m.preferred_language || "";
          return manLang.toLowerCase() === userLanguage.toLowerCase();
        });

        const availableMen = sameLanguageMen.length > 0 ? sameLanguageMen : menProfiles;

        // Check wallet balance for men (must have recharged) - but super users bypass
        const { data: wallets } = await supabase
          .from("wallets")
          .select("user_id, balance")
          .in("user_id", availableMen.map(m => m.user_id));

        const menWithBalance = wallets?.filter(w => w.balance > 0).map(w => w.user_id) || [];

        // Get emails to check for super users
        const menEmails = new Map<string, string>();
        // Note: We can't easily get emails client-side, so super users are identified by their unlimited balance
        // Super users have balance of 999999999 (set by seed function)
        const superUserBalance = 999999999;
        const superUsers = wallets?.filter(w => w.balance >= superUserBalance).map(w => w.user_id) || [];

        // Qualified men: either have balance > 0 or are super users
        const qualifiedMen = availableMen.filter(m => 
          menWithBalance.includes(m.user_id) || superUsers.includes(m.user_id)
        );

        if (qualifiedMen.length === 0) {
          setSearchStatus("No available men with wallet balance. Please try again later.");
          return;
        }

        // Pick a random man
        const randomMan = qualifiedMen[Math.floor(Math.random() * qualifiedMen.length)];
        const manLang = languageMap.get(randomMan.user_id) || randomMan.primary_language || "Unknown";
        const isSameLanguage = manLang.toLowerCase() === userLanguage.toLowerCase();

        setSearchStatus(isSameLanguage ? "Found a same-language match!" : "Found a match with auto-translation!");
        setMatchedUser({
          userId: randomMan.user_id,
          fullName: randomMan.full_name || "Anonymous",
          photoUrl: randomMan.photo_url || null,
          language: manLang,
          isSameLanguage,
          requiresTranslation: !isSameLanguage
        });
      }
    } catch (error: any) {
      console.error("Error finding partner:", error);
      setSearchStatus("Something went wrong. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to find a partner",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const startChatWithMatch = async () => {
    if (!matchedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (userGender === "male") {
        // Start the chat session via edge function
        const { data, error } = await supabase.functions.invoke("chat-manager", {
          body: {
            action: "start_chat",
            man_user_id: user.id,
            woman_user_id: matchedUser.userId
          }
        });

        if (error) throw error;

        if (!data.success) {
          toast({
            title: "Cannot Start Chat",
            description: data.message || "Unable to start chat session",
            variant: "destructive"
          });
          return;
        }
      }

      // Close dialog and navigate to dashboard - parallel chat container will show the chat
      setSearchDialogOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start chat",
        variant: "destructive"
      });
    }
  };

  const cancelSearch = () => {
    setSearchDialogOpen(false);
    setIsSearching(false);
    setMatchedUser(null);
    setSearchStatus("");
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={findRandomPartner}
        className={`gap-2 ${className}`}
        disabled={isSearching}
      >
        {isSearching ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Shuffle className="h-5 w-5" />
        )}
        Random Chat
      </Button>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {matchedUser ? "Match Found!" : "Finding a Partner"}
            </DialogTitle>
            <DialogDescription>
              {matchedUser 
                ? "We found someone for you to chat with!"
                : `Looking for ${userGender === "male" ? "women" : "men"} who speak ${userLanguage}...`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {isSearching && !matchedUser && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <p className="text-muted-foreground">{searchStatus}</p>
              </div>
            )}

            {!isSearching && !matchedUser && searchStatus && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">{searchStatus}</p>
                <Button 
                  variant="auroraOutline" 
                  className="mt-4"
                  onClick={findRandomPartner}
                >
                  Try Again
                </Button>
              </div>
            )}

            {matchedUser && (
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {matchedUser.photoUrl ? (
                    <img 
                      src={matchedUser.photoUrl} 
                      alt={matchedUser.fullName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold">
                      {matchedUser.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-online rounded-full border-2 border-background flex items-center justify-center">
                    <UserCheck className="h-3 w-3 text-online-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">{matchedUser.fullName}</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    Speaks {matchedUser.language}
                  </p>
                  {matchedUser.requiresTranslation ? (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Languages className="h-3 w-3" />
                      Auto-translate
                    </Badge>
                  ) : (
                    <Badge variant="successOutline" className="text-xs">
                      Same language
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="auroraOutline" onClick={cancelSearch}>
                    Cancel
                  </Button>
                  <Button variant="aurora" onClick={startChatWithMatch}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Start Chat
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRechargeDialog} onOpenChange={setShowRechargeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-destructive" />
              Recharge Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rechargeMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/wallet')}>
              Recharge Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
