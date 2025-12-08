import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, 
  Search, 
  Gift, 
  Sparkles,
  Send,
  Wallet,
  Check,
  X,
  Heart
} from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  currency: string;
  description: string | null;
  category: string;
}

interface ReceiverProfile {
  full_name: string | null;
  photo_url: string | null;
}

const GiftSendingScreen = () => {
  const navigate = useNavigate();
  const { receiverId } = useParams<{ receiverId: string }>();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [walletBalance, setWalletBalance] = useState(0);
  const [receiverProfile, setReceiverProfile] = useState<ReceiverProfile | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Load gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from("gifts")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (giftsError) throw giftsError;
      setGifts(giftsData || []);

      // Load wallet balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();
        setWalletBalance(wallet?.balance || 0);
      }

      // Load receiver profile if receiverId provided
      if (receiverId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, photo_url")
          .eq("user_id", receiverId)
          .maybeSingle();
        setReceiverProfile(profile);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load gifts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [receiverId]);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: "gifts",
    onUpdate: loadData
  });

  useRealtimeSubscription({
    table: "wallets",
    onUpdate: loadData
  });

  const handleGiftSelect = (gift: GiftItem) => {
    setSelectedGift(gift);
  };

  const handleSendGift = () => {
    if (!selectedGift) return;
    
    if (walletBalance < selectedGift.price) {
      toast({
        title: "Insufficient Balance",
        description: "Please recharge your wallet to send this gift",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const confirmSendGift = async () => {
    if (!selectedGift || !receiverId) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .single();

      if (!wallet || wallet.balance < selectedGift.price) {
        throw new Error("Insufficient balance");
      }

      // Deduct from wallet
      await supabase
        .from("wallets")
        .update({ balance: wallet.balance - selectedGift.price })
        .eq("id", wallet.id);

      // Record wallet transaction
      await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          type: "debit",
          amount: selectedGift.price,
          description: `Sent gift: ${selectedGift.name}`,
          status: "completed"
        });

      // Record gift transaction
      await supabase
        .from("gift_transactions")
        .insert({
          gift_id: selectedGift.id,
          sender_id: user.id,
          receiver_id: receiverId,
          price_paid: selectedGift.price,
          currency: selectedGift.currency,
          message: giftMessage || null,
          status: "completed"
        });

      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
      setWalletBalance(wallet.balance - selectedGift.price);
      setGiftMessage("");
    } catch (error) {
      console.error("Error sending gift:", error);
      toast({
        title: "Error",
        description: "Failed to send gift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const categories = ["all", ...new Set(gifts.map(g => g.category))];

  const filteredGifts = gifts.filter(gift => {
    const matchesSearch = !searchQuery || 
      gift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gift.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || gift.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="auroraGhost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Send a Gift
                </h1>
                {receiverProfile && (
                  <p className="text-sm text-muted-foreground">
                    To: {receiverProfile.full_name || "Someone special"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">₹{walletBalance.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gifts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize whitespace-nowrap transition-all duration-200"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Gift Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {filteredGifts.map((gift, index) => (
            <Card
              key={gift.id}
              onClick={() => handleGiftSelect(gift)}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg animate-in fade-in zoom-in ${
                selectedGift?.id === gift.id 
                  ? 'ring-2 ring-primary shadow-lg scale-105 bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardContent className="p-3 text-center">
                <div 
                  className={`text-4xl mb-2 transition-transform duration-300 ${
                    selectedGift?.id === gift.id ? 'scale-125 animate-bounce' : ''
                  }`}
                >
                  {gift.emoji}
                </div>
                <div className="font-medium text-sm text-foreground truncate">{gift.name}</div>
                <div className="text-xs text-primary font-semibold mt-1">₹{gift.price}</div>
                {selectedGift?.id === gift.id && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGifts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No gifts found</p>
          </div>
        )}

        {/* Selected Gift Preview */}
        {selectedGift && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 animate-in slide-in-from-bottom-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl animate-pulse">{selectedGift.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{selectedGift.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGift.description}</p>
                  <Badge variant="secondary" className="mt-2 capitalize">{selectedGift.category}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">₹{selectedGift.price}</div>
                  <div className="text-xs text-muted-foreground">{selectedGift.currency}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Action Bar */}
      {selectedGift && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 animate-in slide-in-from-bottom">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSendGift}
              disabled={walletBalance < selectedGift.price}
              className="w-full h-12 text-lg gap-2 group"
            >
              <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              Send {selectedGift.name} - ₹{selectedGift.price}
              <Sparkles className="h-4 w-4 ml-1 animate-pulse" />
            </Button>
            {walletBalance < selectedGift.price && (
              <p className="text-center text-sm text-destructive mt-2">
                Insufficient balance. <button onClick={() => navigate('/wallet')} className="underline">Recharge now</button>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Confirm Gift
            </DialogTitle>
            <DialogDescription>
              You're about to send a gift to {receiverProfile?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGift && (
            <div className="py-4">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2 animate-bounce">{selectedGift.emoji}</div>
                <h3 className="font-semibold text-lg">{selectedGift.name}</h3>
                <p className="text-2xl font-bold text-primary mt-2">₹{selectedGift.price}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Add a message (optional)</label>
                <Textarea
                  placeholder="Write a sweet message..."
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={sending}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={confirmSendGift} disabled={sending} className="gap-2">
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Send Gift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-8">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative bg-primary/10 rounded-full w-full h-full flex items-center justify-center">
                <Heart className="h-12 w-12 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Gift Sent! 🎉</h2>
            <p className="text-muted-foreground">
              Your {selectedGift?.name} has been sent to {receiverProfile?.full_name || "your match"}
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={() => {
                setShowSuccessDialog(false);
                setSelectedGift(null);
              }}>
                Send Another
              </Button>
              <Button onClick={() => navigate(-1)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftSendingScreen;