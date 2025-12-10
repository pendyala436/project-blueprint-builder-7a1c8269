/**
 * AdminSampleUsers.tsx
 * Admin screen for managing sample/demo users by country and language.
 * Uses separate sample_men and sample_women tables.
 * Allows enabling/disabling users per region.
 * 
 * NOTE: This page is for development/staging only.
 * In production mode, seed functions are disabled.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProductionMode } from "@/hooks/useProductionMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Globe, Languages, User, RefreshCw, UserPlus, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";

// Sample user interface matching database schema
interface SampleUser {
  id: string;
  name: string;
  gender: 'male' | 'female';
  country: string;
  language: string;
  age: number;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Grouped structure for display
interface GroupedUsers {
  country: string;
  countryName: string;
  language: string;
  languageName: string;
  males: SampleUser[];
  females: SampleUser[];
  allActive: boolean;
}

export default function AdminSampleUsers() {
  const navigate = useNavigate();
  const { isProduction, loading: prodLoading } = useProductionMode();
  const [loading, setLoading] = useState(true);
  const [sampleMen, setSampleMen] = useState<SampleUser[]>([]);
  const [sampleWomen, setSampleWomen] = useState<SampleUser[]>([]);
  const [groupedUsers, setGroupedUsers] = useState<GroupedUsers[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Fetch all sample users from both tables
  const fetchSampleUsers = async () => {
    setLoading(true);
    try {
      // Fetch from both tables in parallel
      const [menResult, womenResult] = await Promise.all([
        supabase
          .from("sample_men")
          .select("*")
          .order("country", { ascending: true })
          .order("language", { ascending: true }),
        supabase
          .from("sample_women")
          .select("*")
          .order("country", { ascending: true })
          .order("language", { ascending: true })
      ]);

      if (menResult.error) throw menResult.error;
      if (womenResult.error) throw womenResult.error;

      const men = (menResult.data || []).map(m => ({ ...m, gender: 'male' as const }));
      const women = (womenResult.data || []).map(w => ({ ...w, gender: 'female' as const }));

      setSampleMen(men);
      setSampleWomen(women);
      groupUsersByRegion(men, women);
    } catch (error: any) {
      toast.error("Failed to load sample users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Group users by country and language
  const groupUsersByRegion = (men: SampleUser[], women: SampleUser[]) => {
    const groups: Map<string, GroupedUsers> = new Map();
    const allUsers = [...men, ...women];

    allUsers.forEach((user) => {
      const key = `${user.country}-${user.language}`;
      
      if (!groups.has(key)) {
        const countryData = countries.find((c) => c.name === user.country || c.code === user.country);
        const languageData = languages.find((l) => l.name === user.language || l.code === user.language);
        
        groups.set(key, {
          country: user.country,
          countryName: countryData?.name || user.country,
          language: user.language,
          languageName: languageData?.name || user.language,
          males: [],
          females: [],
          allActive: true,
        });
      }

      const group = groups.get(key)!;
      if (user.gender === "male") {
        group.males.push(user);
      } else {
        group.females.push(user);
      }
    });

    // Calculate allActive status for each group
    groups.forEach((group) => {
      const allUsersInGroup = [...group.males, ...group.females];
      group.allActive = allUsersInGroup.length > 0 && allUsersInGroup.every((u) => u.is_active);
    });

    setGroupedUsers(Array.from(groups.values()));
  };

  // Toggle all users in a group
  const toggleGroup = async (group: GroupedUsers) => {
    const groupKey = `${group.country}-${group.language}`;
    setUpdating(groupKey);

    const newStatus = !group.allActive;
    const maleIds = group.males.map((u) => u.id);
    const femaleIds = group.females.map((u) => u.id);

    try {
      // Update both tables in parallel
      if (maleIds.length > 0) {
        const { error } = await supabase
          .from("sample_men")
          .update({ is_active: newStatus })
          .in("id", maleIds);
        if (error) throw error;
      }
      
      if (femaleIds.length > 0) {
        const { error } = await supabase
          .from("sample_women")
          .update({ is_active: newStatus })
          .in("id", femaleIds);
        if (error) throw error;
      }

      toast.success(
        `${group.countryName} (${group.languageName}) sample users ${newStatus ? "enabled" : "disabled"}`
      );
      
      await fetchSampleUsers();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Toggle individual user
  const toggleUser = async (user: SampleUser) => {
    setUpdating(user.id);

    try {
      const tableName = user.gender === 'male' ? 'sample_men' : 'sample_women';
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !user.is_active })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`${user.name} ${!user.is_active ? "enabled" : "disabled"}`);
      await fetchSampleUsers();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Get country flag emoji
  const getCountryFlag = (countryName: string): string => {
    const country = countries.find((c) => c.name === countryName || c.code === countryName);
    return country?.flag || "🌍";
  };

  // Seed super auth users (male1-15, female1-15, admin1-15)
  const seedSuperUsers = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-super-users");

      if (error) throw error;

      if (data.success) {
        const femaleCount = data.results?.females?.length || 0;
        const maleCount = data.results?.males?.length || 0;
        const adminCount = data.results?.admins?.length || 0;
        toast.success(
          `Super users seeded: ${femaleCount} females, ${maleCount} males, ${adminCount} admins`
        );
        await fetchSampleUsers();
      } else {
        throw new Error(data.error || "Seeding failed");
      }
    } catch (error: any) {
      toast.error("Failed to seed super users: " + error.message);
    } finally {
      setSeeding(false);
    }
  };

  // Toggle all users globally
  const toggleAllUsers = async (enable: boolean) => {
    setUpdating("all");
    try {
      const [menResult, womenResult] = await Promise.all([
        supabase.from("sample_men").update({ is_active: enable }).neq("id", ""),
        supabase.from("sample_women").update({ is_active: enable }).neq("id", "")
      ]);

      if (menResult.error) throw menResult.error;
      if (womenResult.error) throw womenResult.error;

      toast.success(`All sample users ${enable ? "enabled" : "disabled"}`);
      await fetchSampleUsers();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchSampleUsers();
  }, []);

  const totalUsers = sampleMen.length + sampleWomen.length;
  const activeUsers = [...sampleMen, ...sampleWomen].filter(u => u.is_active).length;

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sample Users</h1>
              <p className="text-muted-foreground">
                Manage demo profiles by country and language (separate tables)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => toggleAllUsers(false)}
              disabled={updating === "all"}
            >
              Disable All
            </Button>
            <Button 
              variant="outline" 
              onClick={() => toggleAllUsers(true)}
              disabled={updating === "all"}
            >
              Enable All
            </Button>
            <Button variant="outline" onClick={fetchSampleUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Production Mode Warning */}
        {isProduction && (
          <Card className="border-amber-500 bg-amber-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Production Mode Active
              </CardTitle>
              <CardDescription>
                Seed and mock data functions are disabled in production. Only real user data is displayed and used.
                To enable development features, set <code className="bg-muted px-1 rounded">production_mode</code> to <code className="bg-muted px-1 rounded">false</code> in app_settings.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Seed Super Users Card - Only in Dev Mode */}
        {!isProduction && (
          <Card className="border-dashed border-2 border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-amber-500" />
                Create Super Users (Development Only)
                <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500">
                  Dev Mode
                </Badge>
              </CardTitle>
              <CardDescription>
                Creates 45 super users with password <code className="bg-muted px-1 rounded">Chinn@2589</code>
                <br />
                <strong>Unlimited wallet balance (₹999,999,999)</strong> - No recharge ever needed!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-center">
                <Button onClick={seedSuperUsers} disabled={seeding} variant="outline" className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-500/10">
                  {seeding ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating Super Users...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Create Super Users
                    </>
                  )}
                </Button>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3 text-blue-500" /> male1-15@meow-meow.com
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3 text-pink-500" /> female1-15@meow-meow.com
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3 text-amber-500" /> admin1-15@meow-meow.com
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Features:</strong> Unlimited balance, pre-approved, verified, can chat freely. Admins get full admin access.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Sample Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{sampleMen.length}</p>
                  <p className="text-sm text-muted-foreground">Male Profiles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-pink-500" />
                <div>
                  <p className="text-2xl font-bold">{sampleWomen.length}</p>
                  <p className="text-sm text-muted-foreground">Female Profiles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{activeUsers}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grouped Users by Region */}
        <div className="grid gap-4 md:grid-cols-2">
          {groupedUsers.map((group) => {
            const groupKey = `${group.country}-${group.language}`;
            const isUpdating = updating === groupKey;

            return (
              <Card key={groupKey} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getCountryFlag(group.country)}</span>
                      <div>
                        <CardTitle className="text-lg">{group.countryName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Languages className="h-3 w-3" />
                          {group.languageName}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.allActive ? "default" : "secondary"}>
                        {group.allActive ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={group.allActive}
                        onCheckedChange={() => toggleGroup(group)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Males */}
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" /> Male Profiles ({group.males.length})
                    </p>
                    <div className="space-y-2">
                      {group.males.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Age: {user.age}
                            </p>
                          </div>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => toggleUser(user)}
                            disabled={updating === user.id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Females */}
                  <div>
                    <p className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" /> Female Profiles ({group.females.length})
                    </p>
                    <div className="space-y-2">
                      {group.females.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Age: {user.age}
                            </p>
                          </div>
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => toggleUser(user)}
                            disabled={updating === user.id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {groupedUsers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Sample Users Found</h3>
              <p className="text-muted-foreground">
                Sample users will appear here once configured.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
