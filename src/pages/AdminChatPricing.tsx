import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  IndianRupee, 
  Clock, 
  Wallet,
  Save,
  RefreshCw,
  Users,
  TrendingUp,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface ChatPricing {
  id: string;
  rate_per_minute: number;
  women_earning_rate: number;
  video_rate_per_minute: number;
  video_women_earning_rate: number;
  currency: string;
  min_withdrawal_balance: number;
  is_active: boolean;
}

const AdminChatPricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [isEditingVideoRates, setIsEditingVideoRates] = useState(false);
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);
  const [pricing, setPricing] = useState<ChatPricing | null>(null);
  const [formData, setFormData] = useState({
    rate_per_minute: "",
    women_earning_rate: "",
    video_rate_per_minute: "",
    video_women_earning_rate: "",
    min_withdrawal_balance: ""
  });

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_pricing")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPricing(data as ChatPricing);
        setFormData({
          rate_per_minute: data.rate_per_minute?.toString() || "5.00",
          women_earning_rate: (data as any).women_earning_rate?.toString() || "2.00",
          video_rate_per_minute: (data as any).video_rate_per_minute?.toString() || "10.00",
          video_women_earning_rate: (data as any).video_women_earning_rate?.toString() || "5.00",
          min_withdrawal_balance: data.min_withdrawal_balance?.toString() || "10000"
        });
      } else {
        // Set defaults if no pricing exists
        setFormData({
          rate_per_minute: "5.00",
          women_earning_rate: "2.00",
          video_rate_per_minute: "10.00",
          video_women_earning_rate: "5.00",
          min_withdrawal_balance: "10000"
        });
      }
    } catch (error) {
      console.error("Error loading pricing:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing configuration",
        variant: "destructive"
      });
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
    const ratePerMinute = parseFloat(formData.rate_per_minute);
    const womenEarningRate = parseFloat(formData.women_earning_rate);
    const videoRatePerMinute = parseFloat(formData.video_rate_per_minute);
    const videoWomenEarningRate = parseFloat(formData.video_women_earning_rate);
    const minWithdrawal = parseFloat(formData.min_withdrawal_balance);

    if (isNaN(ratePerMinute) || ratePerMinute <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Men's chat rate per minute must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(womenEarningRate) || womenEarningRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Women's chat earning rate must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (womenEarningRate > ratePerMinute) {
      toast({
        title: "Invalid Configuration",
        description: "Women's chat earning rate cannot exceed what men are charged",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(videoRatePerMinute) || videoRatePerMinute <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Men's video call rate per minute must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(videoWomenEarningRate) || videoWomenEarningRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Women's video call earning rate must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (videoWomenEarningRate > videoRatePerMinute) {
      toast({
        title: "Invalid Configuration",
        description: "Women's video earning rate cannot exceed what men are charged",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(minWithdrawal) || minWithdrawal <= 0) {
      toast({
        title: "Invalid Minimum",
        description: "Minimum withdrawal balance must be a positive number",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (pricing) {
        const { error } = await supabase
          .from("chat_pricing")
          .update({
            rate_per_minute: ratePerMinute,
            women_earning_rate: womenEarningRate,
            video_rate_per_minute: videoRatePerMinute,
            video_women_earning_rate: videoWomenEarningRate,
            min_withdrawal_balance: minWithdrawal,
            updated_at: new Date().toISOString()
          } as any)
          .eq("id", pricing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chat_pricing")
          .insert({
            rate_per_minute: ratePerMinute,
            women_earning_rate: womenEarningRate,
            video_rate_per_minute: videoRatePerMinute,
            video_women_earning_rate: videoWomenEarningRate,
            min_withdrawal_balance: minWithdrawal,
            currency: "INR",
            is_active: true
          } as any);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Pricing configuration saved successfully"
      });
      setIsEditingRates(false);
      setIsEditingVideoRates(false);
      setIsEditingWithdrawal(false);
      loadPricing();
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast({
        title: "Error",
        description: "Failed to save pricing configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const chatPlatformProfit = parseFloat(formData.rate_per_minute || "0") - parseFloat(formData.women_earning_rate || "0");
  const videoPlatformProfit = parseFloat(formData.video_rate_per_minute || "0") - parseFloat(formData.video_women_earning_rate || "0");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Chat Pricing Configuration</h1>
            <p className="text-sm text-muted-foreground">Manage charging, earnings and withdrawal settings</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Section 1: Chat Pricing Rates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Chat Pricing Rates
              </CardTitle>
              <CardDescription>
                Per-minute charges and earnings for text chat
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
                {/* Men Rate Input */}
                <div className="space-y-2">
                  <Label htmlFor="rate">Men Charged Per Minute (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={formData.rate_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate_per_minute: e.target.value }))}
                      placeholder="5.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount deducted from men's wallet per minute of active chat
                  </p>
                </div>

                {/* Women Rate Input */}
                <div className="space-y-2">
                  <Label htmlFor="womenRate">Women Earning Per Minute (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="womenRate"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={formData.women_earning_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, women_earning_rate: e.target.value }))}
                      placeholder="2.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount credited to women's earnings per minute of active chat
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Rates
                  </Button>
                  {pricing && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          rate_per_minute: pricing.rate_per_minute.toString(),
                          women_earning_rate: pricing.women_earning_rate.toString()
                        }));
                        setIsEditingRates(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Display Mode - Men Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Men Charged Per Minute</p>
                      <p className="text-2xl font-bold">₹{parseFloat(formData.rate_per_minute).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Display Mode - Women Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Users className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Women Earning Per Minute</p>
                      <p className="text-2xl font-bold text-emerald-600">₹{parseFloat(formData.women_earning_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Platform Profit */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Profit Per Minute</p>
                      <p className="text-2xl font-bold text-blue-600">₹{chatPlatformProfit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Call Pricing Rates Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-500" />
                Video Call Pricing Rates
              </CardTitle>
              <CardDescription>
                Per-minute charges and earnings for video calls
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
                {/* Men Video Rate Input */}
                <div className="space-y-2">
                  <Label htmlFor="videoRate">Men Charged Per Minute - Video (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="videoRate"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={formData.video_rate_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_rate_per_minute: e.target.value }))}
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount deducted from men's wallet per minute of video call
                  </p>
                </div>

                {/* Women Video Rate Input */}
                <div className="space-y-2">
                  <Label htmlFor="videoWomenRate">Women Earning Per Minute - Video (INR)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="videoWomenRate"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-10"
                      value={formData.video_women_earning_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, video_women_earning_rate: e.target.value }))}
                      placeholder="5.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount credited to women's earnings per minute of video call
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Video Rates
                  </Button>
                  {pricing && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          video_rate_per_minute: pricing.video_rate_per_minute.toString(),
                          video_women_earning_rate: pricing.video_women_earning_rate.toString()
                        }));
                        setIsEditingVideoRates(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Display Mode - Men Video Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Video className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Men Charged Per Minute (Video)</p>
                      <p className="text-2xl font-bold">₹{parseFloat(formData.video_rate_per_minute).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Display Mode - Women Video Rate */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-pink-500/5 border border-pink-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/10">
                      <Users className="h-5 w-5 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Women Earning Per Minute (Video)</p>
                      <p className="text-2xl font-bold text-pink-600">₹{parseFloat(formData.video_women_earning_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Platform Profit - Video */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Profit Per Minute (Video)</p>
                      <p className="text-2xl font-bold text-indigo-600">₹{videoPlatformProfit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                Withdrawal Settings
              </CardTitle>
              <CardDescription>
                Minimum balance required for withdrawal requests
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
                      min="0"
                      className="pl-10"
                      value={formData.min_withdrawal_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_withdrawal_balance: e.target.value }))}
                      placeholder="10000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Women must have at least this balance to request a withdrawal
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                  {pricing && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          min_withdrawal_balance: pricing.min_withdrawal_balance.toString()
                        }));
                        setIsEditingWithdrawal(false);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Wallet className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum Withdrawal Balance</p>
                    <p className="text-2xl font-bold text-amber-600">₹{parseInt(formData.min_withdrawal_balance).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default AdminChatPricing;
