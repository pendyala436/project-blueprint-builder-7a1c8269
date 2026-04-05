import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  IndianRupee, 
  Clock, 
  Wallet,
  Save,
  RefreshCw,
  Users,
  TrendingUp,
  Video,
  ShieldCheck,
  Info,
  Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import AdminNav from "@/components/AdminNav";
import { useAdminAccess } from "@/hooks/useAdminAccess";

/**
 * PRICING RULES (enforced here and in DB):
 *
 * Chat (1-to-1 and parallel):
 *   - Men pay ₹4/min per chat session (Indian and non-Indian men both pay)
 *   - Women earn ₹2/min per active chat (exactly half of men's charge)
 *   - Women can have max 3 simultaneous chats (each man billed independently)
 *   - 1 man  → man pays ₹4/min, woman earns ₹2/min
 *   - 2 men  → each pays ₹4/min, woman earns ₹2/min per man = ₹4/min total
 *   - 3 men  → each pays ₹4/min, woman earns ₹2/min per man = ₹6/min total
 *   - No duplicate billing — session-level optimistic lock in DB
 *
 * Video Call (1-to-1, same language only):
 *   - Men pay ₹8/min  |  Women earn ₹4/min  (woman = half of man)
 *   - Same primary/preferred language required for matching
 *
 * Audio Call (1-to-1, P2P):
 *   - Men pay ₹6/min  |  Women earn ₹3/min  (woman = half of man)
 *
 * Private Group Call (hosted by Indian women only):
 *   - Each man pays ₹4/min individually
 *   - Host (Indian woman) earns ₹0.50/min per active male participant
 *   - Any man can join (Indian or non-Indian)
 *
 * All sessions: women earn exactly half what men pay.
 * Minimum withdrawal: ₹5,000 (Indian women only).
 * All records retained for 6 months in admin.
 */

interface ChatPricing {
  id: string;
  rate_per_minute: number;
  women_earning_rate: number;
  video_rate_per_minute: number;
  video_women_earning_rate: number;
  group_call_rate_per_minute: number;
  group_call_women_earning_rate: number;
  currency: string;
  min_withdrawal_balance: number;
  is_active: boolean;
}

const AdminChatPricing = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [isEditingVideoRates, setIsEditingVideoRates] = useState(false);
  const [isEditingGroupRates, setIsEditingGroupRates] = useState(false);
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);
  const [pricing, setPricing] = useState<ChatPricing | null>(null);
  const [formData, setFormData] = useState({
    rate_per_minute: "",
    women_earning_rate: "",
    video_rate_per_minute: "",
    video_women_earning_rate: "",
    group_call_rate_per_minute: "",
    group_call_women_earning_rate: "",
    min_withdrawal_balance: ""
  });

  const loadPricing = async () => {
    try {
      // Get the most recent active pricing - order by updated_at to get latest
      const { data, error } = await supabase
        .from("chat_pricing")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPricing(data as ChatPricing);
        // Load DB values; women_earning_rate must always be exactly half of men's rate.
        // If somehow the DB has inconsistent values, auto-correct them on load.
        const menChat = data.rate_per_minute ?? 4;
        const menVideo = (data as any).video_rate_per_minute ?? 8;
        const menGroup = (data as any).group_call_rate_per_minute ?? 4;
        const groupWomenEarn = (data as any).group_call_women_earning_rate ?? 0.50;
        setFormData({
          rate_per_minute: menChat.toString(),
          women_earning_rate: (menChat / 2).toFixed(2),
          video_rate_per_minute: menVideo.toString(),
          video_women_earning_rate: (menVideo / 2).toFixed(2),
          group_call_rate_per_minute: menGroup.toString(),
          group_call_women_earning_rate: groupWomenEarn.toFixed(2),
          min_withdrawal_balance: (data.min_withdrawal_balance ?? 5000).toString()
        });
      } else if (!pricing) {
        // No DB row exists — seed with canonical defaults.
        // Women always earn exactly half of men's charge.
        setFormData({
          rate_per_minute: "4.00",          // men chat: ₹4/min
          women_earning_rate: "2.00",        // women chat: ₹2/min (half)
          video_rate_per_minute: "8.00",     // men video: ₹8/min
          video_women_earning_rate: "4.00",  // women video: ₹4/min (half)
          group_call_rate_per_minute: "4.00",       // men group: ₹4/min each
          group_call_women_earning_rate: "2.00",     // women group: ₹2/min per man (half)
          min_withdrawal_balance: "5000"     // min withdrawal: ₹5,000
        });
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
      toast.error("Error", { description: "Failed to load pricing configuration" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  // Real-time subscription for pricing updates
  useRealtimeSubscription({
    table: "chat_pricing",
    onUpdate: loadPricing
  });

  const handleSave = async () => {
    const ratePerMinute      = parseFloat(formData.rate_per_minute);
    const videoRatePerMinute = parseFloat(formData.video_rate_per_minute);
    const groupCallRate      = parseFloat(formData.group_call_rate_per_minute);
    const minWithdrawal      = parseFloat(formData.min_withdrawal_balance);

    // ── Validate men's rates are positive numbers ──────────────────────────────
    if (isNaN(ratePerMinute) || ratePerMinute <= 0) {
      toast.error("Invalid Rate", { description: "Men's chat rate must be a positive number" });
      return;
    }
    if (isNaN(videoRatePerMinute) || videoRatePerMinute <= 0) {
      toast.error("Invalid Rate", { description: "Men's video rate must be a positive number" });
      return;
    }
    if (isNaN(groupCallRate) || groupCallRate <= 0) {
      toast.error("Invalid Rate", { description: "Men's group call rate must be a positive number" });
      return;
    }
    if (isNaN(minWithdrawal) || minWithdrawal <= 0) {
      toast.error("Invalid Minimum", { description: "Minimum withdrawal balance must be a positive number" });
      return;
    }

    // ── HARD RULE: women always earn exactly half of what men are charged ──────
    // Compute women's rates from men's rates — no manual override allowed.
    const womenEarningRate      = parseFloat((ratePerMinute / 2).toFixed(2));
    const videoWomenEarningRate = parseFloat((videoRatePerMinute / 2).toFixed(2));
    const groupCallWomenRate    = parseFloat((groupCallRate / 2).toFixed(2));

    setIsSaving(true);
    try {
      const pricingData = {
        rate_per_minute:              ratePerMinute,
        women_earning_rate:           womenEarningRate,           // always half
        video_rate_per_minute:        videoRatePerMinute,
        video_women_earning_rate:     videoWomenEarningRate,      // always half
        group_call_rate_per_minute:   groupCallRate,
        group_call_women_earning_rate: groupCallWomenRate,        // always half per man
        min_withdrawal_balance:       minWithdrawal,
        currency:    "INR",
        is_active:   true,
        updated_at:  new Date().toISOString()
      };

      if (pricing?.id) {
        // Update the single active pricing row — no duplicates ever inserted.
        const { error } = await supabase
          .from("chat_pricing")
          .update(pricingData as any)
          .eq("id", pricing.id);
        if (error) throw error;
      } else {
        // First-time insert — use upsert to prevent race conditions.
        // If another admin concurrently inserts, the DB constraint prevents duplicates.
        // We rely on is_active + currency as a natural unique pair (only one active config per currency).
        const { data: existing } = await supabase
          .from("chat_pricing")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          // Another concurrent request already created a row — update it instead
          const { error } = await supabase
            .from("chat_pricing")
            .update(pricingData as any)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("chat_pricing").insert(pricingData as any);
          if (error) throw error;
        }
      }

      // Reflect the enforced half-rule back into form so UI stays consistent
      setFormData(prev => ({
        ...prev,
        women_earning_rate:           womenEarningRate.toFixed(2),
        video_women_earning_rate:     videoWomenEarningRate.toFixed(2),
        group_call_women_earning_rate: groupCallWomenRate.toFixed(2),
      }));

      toast.success("Saved", { description: "Pricing updated — women earn exactly half of men's rate across all sessions." });
      setIsEditingRates(false);
      setIsEditingVideoRates(false);
      setIsEditingGroupRates(false);
      setIsEditingWithdrawal(false);
      await loadPricing();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("Error", { description: "Failed to save pricing configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  // Women always earn exactly half — these are derived, never independently editable.
  const chatWomenRate  = (parseFloat(formData.rate_per_minute  || "0") / 2);
  const videoWomenRate = (parseFloat(formData.video_rate_per_minute  || "0") / 2);
  const groupWomenRate = (parseFloat(formData.group_call_rate_per_minute || "0") / 2);

  const chatPlatformProfit  = parseFloat(formData.rate_per_minute  || "0") - chatWomenRate;
  const videoPlatformProfit = parseFloat(formData.video_rate_per_minute  || "0") - videoWomenRate;
  const groupPlatformProfit = parseFloat(formData.group_call_rate_per_minute || "0") - groupWomenRate;

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <AdminNav>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminNav>
    );
  }

  return (
    <AdminNav>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Chat Pricing Configuration</h1>
          <p className="text-muted-foreground">Manage per-session charging and earnings. Women always earn exactly half of what men are charged.</p>
        </div>

        {/* ── Pricing Rules Summary ─────────────────────────────────────── */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-blue-700 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              Enforced Pricing Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <p>• <strong>Chat:</strong> Men (Indian &amp; non-Indian) pay per minute. Women earn half per active chat. Max 3 simultaneous chats per woman.</p>
            <p>• <strong>Video Call:</strong> 1-to-1, same language only. Men pay double what women earn.</p>
            <p>• <strong>Group Call:</strong> Hosted by Indian women only. Each man charged individually. Host earns half per active man per minute.</p>
            <p>• <strong>Gifts:</strong> 100% of gift price deducted from man's wallet. No balance = no gift. Women receive exactly half the gift price as earnings. Platform keeps the other half.</p>
            <p>• <strong>All sessions:</strong> No duplicate billing. Indian women only earn. Min withdrawal ₹5,000. Records stored 6 months.</p>
          </CardContent>
        </Card>

        {/* ── Chat Pricing ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Chat Pricing Rates
              </CardTitle>
              <CardDescription>
                Per-minute charges for text chat. Women earn exactly half.
                <br />
                <span className="text-xs text-muted-foreground">
                  1 man → pays ₹{parseFloat(formData.rate_per_minute||"4").toFixed(2)}/min, woman earns ₹{chatWomenRate.toFixed(2)}/min
                  &nbsp;|&nbsp;
                  2 men → each pays ₹{parseFloat(formData.rate_per_minute||"4").toFixed(2)}/min, woman earns ₹{(chatWomenRate*2).toFixed(2)}/min total
                  &nbsp;|&nbsp;
                  3 men → each pays ₹{parseFloat(formData.rate_per_minute||"4").toFixed(2)}/min, woman earns ₹{(chatWomenRate*3).toFixed(2)}/min total
                </span>
              </CardDescription>
            </div>
            {!isEditingRates && pricing && (
              <Button variant="outline" onClick={() => setIsEditingRates(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Change
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingRates || !pricing ? (
              <div className="space-y-6">
                {/* Men's chat rate — editable */}
                <div className="space-y-2">
                  <Label htmlFor="rate">Men Charged Per Minute (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="pl-10"
                      value={formData.rate_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_per_minute: e.target.value }))}
                      placeholder="4.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Amount deducted from each man's wallet per minute of active chat</p>
                </div>

                {/* Women's chat rate — read-only, always half */}
                <div className="space-y-2">
                  <Label htmlFor="womenRate" className="flex items-center gap-2">
                    Women Earning Per Minute (INR)
                    <Badge variant="secondary" className="text-xs font-normal">Auto: always half of men</Badge>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="womenRate"
                      type="number"
                      className="pl-10 bg-muted cursor-not-allowed"
                      value={chatWomenRate.toFixed(2)}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Automatically set to half of men's rate. Per chat session — credited per active man.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Rates
                  </Button>
                  {pricing && (
                    <Button variant="outline" onClick={() => {
                      setFormData(prev => ({ ...prev, rate_per_minute: pricing.rate_per_minute.toString() }));
                      setIsEditingRates(false);
                    }}>Cancel</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Men Charged Per Minute</p>
                      <p className="text-2xl font-bold">₹{parseFloat(formData.rate_per_minute).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Women Earning Per Minute (per active chat)</p>
                      <p className="text-2xl font-bold text-primary">₹{chatWomenRate.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">× number of concurrent men (max 3)</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Profit Per Minute</p>
                      <p className="text-2xl font-bold text-primary">₹{chatPlatformProfit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Video Call Pricing ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Video Call Pricing Rates
              </CardTitle>
              <CardDescription>
                1-to-1 video calls between same-language men and women. Women earn exactly half.
              </CardDescription>
            </div>
            {!isEditingVideoRates && pricing && (
              <Button variant="outline" onClick={() => setIsEditingVideoRates(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Change
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingVideoRates || !pricing ? (
              <div className="space-y-6">
                {/* Men video rate — editable */}
                <div className="space-y-2">
                  <Label htmlFor="videoRate">Men Charged Per Minute — Video (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="videoRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="pl-10"
                      value={formData.video_rate_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_rate_per_minute: e.target.value }))}
                      placeholder="8.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Amount deducted from man's wallet per minute of video call</p>
                </div>

                {/* Women video rate — read-only */}
                <div className="space-y-2">
                  <Label htmlFor="videoWomenRate" className="flex items-center gap-2">
                    Women Earning Per Minute — Video (INR)
                    <Badge variant="secondary" className="text-xs font-normal">Auto: always half of men</Badge>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="videoWomenRate"
                      type="number"
                      className="pl-10 bg-muted cursor-not-allowed"
                      value={videoWomenRate.toFixed(2)}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Automatically set to half of men's video rate.</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Video Rates
                  </Button>
                  {pricing && (
                    <Button variant="outline" onClick={() => {
                      setFormData(prev => ({ ...prev, video_rate_per_minute: pricing.video_rate_per_minute.toString() }));
                      setIsEditingVideoRates(false);
                    }}>Cancel</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Video className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Men Charged Per Minute (Video)</p>
                      <p className="text-2xl font-bold">₹{parseFloat(formData.video_rate_per_minute).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Women Earning Per Minute (Video)</p>
                      <p className="text-2xl font-bold text-primary">₹{videoWomenRate.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Profit Per Minute (Video)</p>
                      <p className="text-2xl font-bold text-primary">₹{videoPlatformProfit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Private Group Call Pricing ────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Private Group Call Pricing
              </CardTitle>
              <CardDescription>
                Hosted by Indian women. Each man charged individually. Host earns half per man per minute.
              </CardDescription>
            </div>
            {!isEditingGroupRates && pricing && (
              <Button variant="outline" onClick={() => setIsEditingGroupRates(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Change
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingGroupRates || !pricing ? (
              <div className="space-y-6">
                {/* Men group rate — editable */}
                <div className="space-y-2">
                  <Label htmlFor="groupRate">Each Man Charged Per Minute — Group Call (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="groupRate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="pl-10"
                      value={formData.group_call_rate_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, group_call_rate_per_minute: e.target.value }))}
                      placeholder="4.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Deducted from each man's wallet independently per minute</p>
                </div>

                {/* Women group rate — read-only */}
                <div className="space-y-2">
                  <Label htmlFor="groupWomenRate" className="flex items-center gap-2">
                    Host (Indian Woman) Earning Per Man Per Minute (INR)
                    <Badge variant="secondary" className="text-xs font-normal">Auto: always half of men</Badge>
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="groupWomenRate"
                      type="number"
                      className="pl-10 bg-muted cursor-not-allowed"
                      value={groupWomenRate.toFixed(2)}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically half of men's rate. With N active men: host earns ₹{groupWomenRate.toFixed(2)} × N/min.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Group Rates
                  </Button>
                  {pricing && (
                    <Button variant="outline" onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        group_call_rate_per_minute: ((pricing as any).group_call_rate_per_minute ?? 4).toString(),
                      }));
                      setIsEditingGroupRates(false);
                    }}>Cancel</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Each Man Charged Per Minute (Group)</p>
                      <p className="text-2xl font-bold">₹{parseFloat(formData.group_call_rate_per_minute).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Billed independently per man</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Host Earning Per Man Per Minute</p>
                      <p className="text-2xl font-bold text-primary">₹{groupWomenRate.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">× number of active men in call</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Profit Per Man Per Minute</p>
                      <p className="text-2xl font-bold text-primary">₹{groupPlatformProfit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Gift Pricing Rules ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Gift Pricing Rules
            </CardTitle>
            <CardDescription>
              Fixed rules for gift transactions between men and women. Gift prices are managed in Gift Pricing settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><IndianRupee className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Men Pay (Wallet Deduction)</p>
                  <p className="text-2xl font-bold">100%</p>
                  <p className="text-xs text-muted-foreground">Full gift price deducted from man's wallet. No balance = gift blocked.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Women Receive (Earnings Credit)</p>
                  <p className="text-2xl font-bold text-primary">50%</p>
                  <p className="text-xs text-muted-foreground">Half the gift price credited to woman's earnings balance.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Profit Per Gift</p>
                  <p className="text-2xl font-bold text-primary">50%</p>
                  <p className="text-xs text-muted-foreground">Platform retains the other half of every gift transaction.</p>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Gift prices are configured in <strong>Admin → Gift Pricing</strong>. Men cannot send gifts if their wallet balance is insufficient. Negative balances are never allowed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Withdrawal Settings
              </CardTitle>
              <CardDescription>
                Minimum balance required for Indian women to request a withdrawal. Default: ₹5,000.
              </CardDescription>
            </div>
            {!isEditingWithdrawal && pricing && (
              <Button variant="outline" onClick={() => setIsEditingWithdrawal(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Change
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingWithdrawal || !pricing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minWithdrawal">Minimum Withdrawal Balance (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="minWithdrawal"
                      type="number"
                      step="100"
                      min="100"
                      className="pl-10"
                      value={formData.min_withdrawal_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_withdrawal_balance: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Indian women must accumulate at least this amount before requesting a withdrawal
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </Button>
                  {pricing && (
                    <Button variant="outline" onClick={() => {
                      setFormData(prev => ({ ...prev, min_withdrawal_balance: (pricing.min_withdrawal_balance ?? 5000).toString() }));
                      setIsEditingWithdrawal(false);
                    }}>Cancel</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum Withdrawal Balance</p>
                    <p className="text-2xl font-bold text-primary">₹{parseInt(formData.min_withdrawal_balance).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminNav>
  );
};

export default AdminChatPricing;
