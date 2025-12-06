import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Gift,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  DollarSign,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftItem {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  price: number;
  currency: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Currency conversion rates (base: INR)
const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
];

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "flowers", label: "Flowers" },
  { value: "love", label: "Love" },
  { value: "food", label: "Food & Drinks" },
  { value: "luxury", label: "Luxury" },
  { value: "toys", label: "Toys" },
  { value: "drinks", label: "Drinks" },
];

const EMOJI_OPTIONS = ["🎁", "🌹", "❤️", "💐", "🍫", "💍", "🧸", "🍾", "⭐", "💋", "👑", "🎂", "🎈", "💎", "🌸", "🔥", "💝", "🎀", "🌟", "🦋"];

const AdminGiftPricing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    emoji: "🎁",
    price: 0,
    currency: "INR",
    category: "general",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchGifts();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    }
  };

  const fetchGifts = async () => {
    try {
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setGifts(data || []);
    } catch (error) {
      console.error("Error fetching gifts:", error);
      toast.error("Failed to load gifts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGifts();
  };

  const handleAddGift = () => {
    setSelectedGift(null);
    setEditForm({
      name: "",
      description: "",
      emoji: "🎁",
      price: 0,
      currency: "INR",
      category: "general",
      is_active: true,
      sort_order: gifts.length + 1,
    });
    setEditDialogOpen(true);
  };

  const handleEditGift = (gift: GiftItem) => {
    setSelectedGift(gift);
    setEditForm({
      name: gift.name,
      description: gift.description || "",
      emoji: gift.emoji,
      price: gift.price,
      currency: gift.currency,
      category: gift.category,
      is_active: gift.is_active,
      sort_order: gift.sort_order,
    });
    setEditDialogOpen(true);
  };

  const handleSaveGift = async () => {
    if (!editForm.name.trim()) {
      toast.error("Gift name is required");
      return;
    }

    try {
      if (selectedGift) {
        // Update existing gift
        const { error } = await supabase
          .from("gifts")
          .update({
            name: editForm.name,
            description: editForm.description || null,
            emoji: editForm.emoji,
            price: editForm.price,
            currency: editForm.currency,
            category: editForm.category,
            is_active: editForm.is_active,
            sort_order: editForm.sort_order,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedGift.id);

        if (error) throw error;
        toast.success("Gift updated successfully");
      } else {
        // Create new gift
        const { error } = await supabase
          .from("gifts")
          .insert({
            name: editForm.name,
            description: editForm.description || null,
            emoji: editForm.emoji,
            price: editForm.price,
            currency: editForm.currency,
            category: editForm.category,
            is_active: editForm.is_active,
            sort_order: editForm.sort_order,
          });

        if (error) throw error;
        toast.success("Gift created successfully");
      }

      setEditDialogOpen(false);
      fetchGifts();
    } catch (error) {
      console.error("Error saving gift:", error);
      toast.error("Failed to save gift");
    }
  };

  const handleQuickPriceUpdate = async (gift: GiftItem, newPrice: number) => {
    setSavingId(gift.id);
    try {
      const { error } = await supabase
        .from("gifts")
        .update({
          price: newPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gift.id);

      if (error) throw error;
      
      setGifts(prev => prev.map(g => 
        g.id === gift.id ? { ...g, price: newPrice } : g
      ));
      
      toast.success(`Price updated to ₹${newPrice}`);
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("Failed to update price");
    } finally {
      setTimeout(() => setSavingId(null), 500);
    }
  };

  const handleToggleActive = async (gift: GiftItem) => {
    try {
      const { error } = await supabase
        .from("gifts")
        .update({
          is_active: !gift.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gift.id);

      if (error) throw error;
      
      setGifts(prev => prev.map(g => 
        g.id === gift.id ? { ...g, is_active: !g.is_active } : g
      ));
      
      toast.success(`Gift ${gift.is_active ? "deactivated" : "activated"}`);
    } catch (error) {
      console.error("Error toggling gift:", error);
      toast.error("Failed to update gift status");
    }
  };

  const handleDeleteGift = (gift: GiftItem) => {
    setSelectedGift(gift);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteGift = async () => {
    if (!selectedGift) return;

    try {
      const { error } = await supabase
        .from("gifts")
        .delete()
        .eq("id", selectedGift.id);

      if (error) throw error;

      toast.success("Gift deleted successfully");
      setDeleteDialogOpen(false);
      fetchGifts();
    } catch (error) {
      console.error("Error deleting gift:", error);
      toast.error("Failed to delete gift");
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol || "₹";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Gift className="h-6 w-6 text-primary" />
                Gift Pricing
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Manage and update virtual gift prices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="gradient" onClick={handleAddGift} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Gift
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gifts</p>
                  <p className="text-2xl font-bold">{gifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Check className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    {gifts.filter(g => g.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Price</p>
                  <p className="text-2xl font-bold text-amber-500">
                    ₹{Math.round(gifts.reduce((acc, g) => acc + g.price, 0) / gifts.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <Sparkles className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Premium</p>
                  <p className="text-2xl font-bold text-rose-500">
                    {gifts.filter(g => g.price >= 300).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gifts Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Virtual Gifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Icon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No gifts found. Add your first gift!
                      </TableCell>
                    </TableRow>
                  ) : (
                    gifts.map((gift, index) => (
                      <TableRow
                        key={gift.id}
                        className={cn(
                          "transition-all duration-200 hover:bg-muted/50 animate-fade-in group",
                          !gift.is_active && "opacity-50"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell>
                          <div className="text-3xl group-hover:scale-125 transition-transform">
                            {gift.emoji}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{gift.name}</p>
                            {gift.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {gift.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {gift.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={gift.price}
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                setGifts(prev => prev.map(g => 
                                  g.id === gift.id ? { ...g, price: newPrice } : g
                                ));
                              }}
                              onBlur={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                if (newPrice !== gift.price) {
                                  handleQuickPriceUpdate(gift, newPrice);
                                }
                              }}
                              className={cn(
                                "w-24 h-8 text-right font-mono transition-all",
                                savingId === gift.id && "bg-emerald-500/20 border-emerald-500"
                              )}
                              min={0}
                            />
                            <span className="text-sm text-muted-foreground">
                              {getCurrencySymbol(gift.currency)}
                            </span>
                            {savingId === gift.id && (
                              <Check className="h-4 w-4 text-emerald-500 animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={gift.is_active}
                            onCheckedChange={() => handleToggleActive(gift)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditGift(gift)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteGift(gift)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {selectedGift ? "Edit Gift" : "Add New Gift"}
            </DialogTitle>
            <DialogDescription>
              {selectedGift ? "Update gift details and pricing" : "Create a new virtual gift"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Emoji Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/30">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, emoji }))}
                    className={cn(
                      "text-2xl p-2 rounded-lg transition-all hover:bg-background",
                      editForm.emoji === emoji && "bg-primary/20 ring-2 ring-primary"
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Gift Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter gift name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={2}
              />
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={editForm.currency}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active Status</Label>
                <p className="text-xs text-muted-foreground">Gift visible to users</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSaveGift} className="gap-2">
              <Save className="h-4 w-4" />
              {selectedGift ? "Update Gift" : "Create Gift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Gift
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedGift?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGift}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGiftPricing;
