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
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatPricing {
  id: string;
  rate_per_minute: number;
  women_earning_rate: number;
  currency: string;
  min_withdrawal_balance: number;
  is_active: boolean;
}

const AdminChatPricing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pricing, setPricing] = useState<ChatPricing | null>(null);
  const [formData, setFormData] = useState({
    rate_per_minute: "",
    women_earning_rate: "",
    min_withdrawal_balance: ""
  });

  useEffect(() => {
    loadPricing();
  }, []);

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
          rate_per_minute: data.rate_per_minute.toString(),
          women_earning_rate: (data as any).women_earning_rate?.toString() || "2.00",
          min_withdrawal_balance: data.min_withdrawal_balance.toString()
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

  const handleSave = async () => {
    const ratePerMinute = parseFloat(formData.rate_per_minute);
    const womenEarningRate = parseFloat(formData.women_earning_rate);
    const minWithdrawal = parseFloat(formData.min_withdrawal_balance);

    if (isNaN(ratePerMinute) || ratePerMinute <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Men's rate per minute must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (isNaN(womenEarningRate) || womenEarningRate <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Women's earning rate must be a positive number",
        variant: "destructive"
      });
      return;
    }

    if (womenEarningRate > ratePerMinute) {
      toast({
        title: "Invalid Configuration",
        description: "Women's earning rate cannot exceed what men are charged",
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

  const platformProfit = parseFloat(formData.rate_per_minute || "0") - parseFloat(formData.women_earning_rate || "0");

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
        {/* Men Charging Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Men Charged Per Minute
            </CardTitle>
            <CardDescription>
              Amount deducted from men's wallet per minute of active chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Rate per Minute (INR)</Label>
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
                    placeholder="4.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: If set to ₹4.00, a 30-minute chat costs men ₹120.00
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Women Earning Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Women Earning Per Minute
            </CardTitle>
            <CardDescription>
              Amount credited to women's earnings per minute of active chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="womenRate">Earning per Minute (INR)</Label>
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
                  Example: If set to ₹2.00, a 30-minute chat earns women ₹60.00
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Profit Display */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Profit Per Minute</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{platformProfit.toFixed(2)}/min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-500" />
              Withdrawal Settings
            </CardTitle>
            <CardDescription>
              Minimum balance required for withdrawal requests
            </CardDescription>
          </CardHeader>
          <CardContent>
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
            </div>
          </CardContent>
        </Card>

        {/* Summary and Save */}
        <Card className="bg-gradient-to-r from-primary/10 to-rose-500/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Current Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Men: ₹{formData.rate_per_minute || "0"}/min • Women: ₹{formData.women_earning_rate || "0"}/min • Min Withdrawal: ₹{parseInt(formData.min_withdrawal_balance || "0").toLocaleString()}
                </p>
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminChatPricing;
