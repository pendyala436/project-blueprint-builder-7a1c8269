import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gift, Loader2, Wallet, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
  description: string | null;
}

interface GiftSendButtonProps {
  senderId: string;
  receiverId: string;
  receiverName: string;
  disabled?: boolean;
}

export const GiftSendButton = ({
  senderId,
  receiverId,
  receiverName,
  disabled = false,
}: GiftSendButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [sentGift, setSentGift] = useState<{ name: string; emoji: string } | null>(null);

  // Load gifts and wallet balance when popover opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, senderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch active gifts
      const { data: giftsData, error: giftsError } = await supabase
        .from("gifts")
        .select("id, name, emoji, price, category, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (giftsError) throw giftsError;
      setGifts(giftsData || []);

      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", senderId)
        .maybeSingle();

      if (walletError) throw walletError;
      setWalletBalance(walletData?.balance || 0);
    } catch (error) {
      console.error("Error loading gift data:", error);
      toast.error("Failed to load gifts");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGift = (gift: GiftItem) => {
    if (walletBalance < gift.price) {
      toast.error("Insufficient balance", {
        description: `You need ₹${gift.price} but only have ₹${walletBalance}`,
      });
      return;
    }
    setSelectedGift(gift);
    setConfirmDialogOpen(true);
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;

    setSending(true);
    try {
      // Call the atomic gift transaction function
      const { data, error } = await supabase.rpc("process_gift_transaction", {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_gift_id: selectedGift.id,
        p_message: giftMessage || null,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        gift_name?: string;
        gift_emoji?: string;
        new_balance?: number;
        women_share?: number;
        admin_share?: number;
      };

      if (!result.success) {
        throw new Error(result.error || "Failed to send gift");
      }

      // Update local wallet balance
      if (typeof result.new_balance === "number") {
        setWalletBalance(result.new_balance);
      }

      // Show success
      setSentGift({ name: result.gift_name || selectedGift.name, emoji: result.gift_emoji || selectedGift.emoji });
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
      setGiftMessage("");
      setSelectedGift(null);

      // Send a chat message about the gift
      const chatId = `chat_${senderId < receiverId ? senderId : receiverId}_${senderId < receiverId ? receiverId : senderId}`;
      await supabase.from("chat_messages").insert({
        chat_id: chatId,
        sender_id: senderId,
        receiver_id: receiverId,
        message: `🎁 Sent a gift: ${result.gift_emoji || selectedGift.emoji} ${result.gift_name || selectedGift.name}${giftMessage ? ` - "${giftMessage}"` : ""}`,
      });

    } catch (error: any) {
      console.error("Error sending gift:", error);
      toast.error("Failed to send gift", {
        description: error.message || "Please try again",
      });
    } finally {
      setSending(false);
    }
  };

  const categories = [...new Set(gifts.map((g) => g.category))];

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch = gift.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || gift.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary disabled:opacity-50"
          >
            <Gift className="w-5 h-5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" side="top" align="start">
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Send a Gift
              </h4>
              <Badge variant="outline" className="gap-1">
                <Wallet className="w-3 h-3" />
                ₹{walletBalance.toLocaleString()}
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-1 p-2 overflow-x-auto border-b border-border">
            <Badge
              variant={!selectedCategory ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                className="cursor-pointer shrink-0 capitalize"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGifts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No gifts found
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 p-2">
                {filteredGifts.map((gift) => {
                  const canAfford = walletBalance >= gift.price;
                  return (
                    <button
                      key={gift.id}
                      onClick={() => handleSelectGift(gift)}
                      disabled={!canAfford}
                      className={cn(
                        "flex flex-col items-center p-2 rounded-lg border transition-all hover:scale-105",
                        canAfford
                          ? "border-border hover:border-primary hover:bg-primary/5 cursor-pointer"
                          : "border-border/50 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-2xl mb-1">{gift.emoji}</span>
                      <span className="text-xs font-medium truncate w-full text-center">
                        {gift.name}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          canAfford ? "text-primary" : "text-destructive"
                        )}
                      >
                        ₹{gift.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Send {selectedGift?.emoji} {selectedGift?.name}?
            </DialogTitle>
            <DialogDescription>
              This will cost ₹{selectedGift?.price} from your wallet.
              <br />
              <span className="text-xs text-muted-foreground">
                ({receiverName} will receive 50% of the gift value)
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-center text-5xl py-4">
              {selectedGift?.emoji}
            </div>
            <Textarea
              placeholder="Add a message (optional)..."
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              rows={2}
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Your balance:</span>
              <span className="font-medium">₹{walletBalance.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>After sending:</span>
              <span className="font-medium text-primary">
                ₹{(walletBalance - (selectedGift?.price || 0)).toLocaleString()}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendGift} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Send Gift
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6">
            <div className="text-6xl mb-4 animate-bounce">{sentGift?.emoji}</div>
            <h3 className="text-xl font-semibold mb-2">Gift Sent!</h3>
            <p className="text-muted-foreground">
              You sent {sentGift?.name} to {receiverName}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => { setSuccessDialogOpen(false); setIsOpen(false); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GiftSendButton;
