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
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatPricing {
  id: string;
  rate_per_minute: number;
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
        setPricing(data);
        setFormData({
          rate_per_minute: data.rate_per_minute.toString(),
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
    const minWithdrawal = parseFloat(formData.min_withdrawal_balance);

    if (isNaN(ratePerMinute) || ratePerMinute <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Rate per minute must be a positive number",
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
            min_withdrawal_balance: minWithdrawal,
            updated_at: new Date().toISOString()
          })
          .eq("id", pricing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chat_pricing")
          .insert({
            rate_per_minute: ratePerMinute,
            min_withdrawal_balance: minWithdrawal,
            currency: "INR",
            is_active: true
          });

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
            <p className="text-sm text-muted-foreground">Manage earnings and withdrawal settings</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Per-Minute Rate
            </CardTitle>
            <CardDescription>
              Amount women earn per minute of active chat
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
                    placeholder="2.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: If set to ₹2.00, a 30-minute chat earns ₹60.00
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-500" />
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

        <Card className="bg-gradient-to-r from-primary/10 to-rose-500/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Current Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Rate: ₹{formData.rate_per_minute || "0"}/min • Min Withdrawal: ₹{parseInt(formData.min_withdrawal_balance || "0").toLocaleString()}
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
