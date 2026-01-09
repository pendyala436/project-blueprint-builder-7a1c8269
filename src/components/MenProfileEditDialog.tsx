/**
 * MenProfileEditDialog Component
 * 
 * Profile edit dialog specifically for male users.
 * Uses all 386 languages from languages.ts.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, User, Calendar, MapPin, Briefcase, Book, Heart, Camera, Languages, Globe, Check, ChevronsUpDown } from "lucide-react";
import { countries } from "@/data/countries";
import { statesByCountry, State } from "@/data/states";
import ProfilePhotosSection from "@/components/ProfilePhotosSection";
import { ALL_LANGUAGES, INDIAN_LANGUAGES, NON_INDIAN_LANGUAGES } from "@/data/profileLanguages";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  country: string | null;
  state: string | null;
  bio: string | null;
  occupation: string | null;
  education_level: string | null;
  height_cm: number | null;
  body_type: string | null;
  marital_status: string | null;
  religion: string | null;
  interests: string[] | null;
  life_goals: string[] | null;
  primary_language: string | null;
}

interface UserLanguage {
  language_name: string;
  language_code: string;
}

interface MenProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
}

const EDUCATION_LEVELS = [
  "High School", "Some College", "Associate Degree", "Bachelor's Degree",
  "Master's Degree", "Doctorate", "Professional Degree", "Other"
];

const BODY_TYPES = ["Slim", "Athletic", "Average", "Muscular", "Heavy"];

const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"];

const RELIGIONS = [
  "Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Jewish", "Other", "Prefer not to say"
];

const INTEREST_OPTIONS = [
  "Music", "Movies", "Travel", "Reading", "Sports", "Cooking", "Photography",
  "Art", "Gaming", "Fitness", "Technology", "Cars", "Business", "Investing"
];

const LIFE_GOAL_OPTIONS = [
  "Career Growth", "Family", "Travel the World", "Financial Freedom",
  "Health & Fitness", "Education", "Start a Business", "Finding Love"
];

const MenProfileEditDialog = ({ open, onOpenChange, onProfileUpdated }: MenProfileEditDialogProps) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: null, phone: null, gender: null, date_of_birth: null,
    country: null, state: null, bio: null, occupation: null,
    education_level: null, height_cm: null, body_type: null,
    marital_status: null, religion: null, interests: null,
    life_goals: null, primary_language: null,
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState<UserLanguage | null>(null);
  const [userLanguage, setUserLanguage] = useState<UserLanguage | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableStates, setAvailableStates] = useState<State[]>([]);

  const hasChanges = useMemo(() => {
    if (!originalProfile) return false;
    const profileChanged = Object.keys(profile).some(key => {
      const k = key as keyof ProfileData;
      const current = profile[k] === undefined ? null : profile[k];
      const original = originalProfile[k] === undefined ? null : originalProfile[k];
      if (Array.isArray(current) && Array.isArray(original)) {
        return JSON.stringify(current) !== JSON.stringify(original);
      }
      return current !== original;
    });
    const languageChanged = (userLanguage?.language_code ?? '') !== (originalLanguage?.language_code ?? '');
    return profileChanged || languageChanged;
  }, [profile, originalProfile, userLanguage, originalLanguage]);

  useEffect(() => {
    if (open) loadProfile();
  }, [open]);

  useEffect(() => {
    const countryData = countries.find(c => c.name === profile.country);
    if (countryData && statesByCountry[countryData.code]) {
      setAvailableStates(statesByCountry[countryData.code]);
    } else {
      setAvailableStates([]);
    }
  }, [profile.country]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);
      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.primary_language) {
        const foundLang = ALL_LANGUAGES.find(l => l.name === data.primary_language);
        if (foundLang) {
          const langData = { language_name: foundLang.name, language_code: foundLang.code };
          setUserLanguage(langData);
          setOriginalLanguage(langData);
        }
      }

      if (data) {
        const profileData: ProfileData = {
          full_name: data.full_name, phone: data.phone, gender: data.gender,
          date_of_birth: data.date_of_birth, country: data.country, state: data.state,
          bio: data.bio, occupation: data.occupation, education_level: data.education_level,
          height_cm: data.height_cm, body_type: data.body_type, marital_status: data.marital_status,
          religion: data.religion, interests: data.interests, life_goals: data.life_goals,
          primary_language: data.primary_language,
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileData = {
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth,
        country: profile.country,
        state: profile.state,
        bio: profile.bio,
        occupation: profile.occupation,
        education_level: profile.education_level,
        height_cm: profile.height_cm,
        body_type: profile.body_type,
        marital_status: profile.marital_status,
        religion: profile.religion,
        interests: profile.interests,
        life_goals: profile.life_goals,
        primary_language: userLanguage?.language_name || profile.primary_language,
        preferred_language: userLanguage?.language_name || profile.primary_language,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("user_id", user.id);
      if (error) throw error;

      if (userLanguage) {
        await supabase.from("user_languages").delete().eq("user_id", user.id);
        await supabase.from("user_languages").insert({
          user_id: user.id,
          language_name: userLanguage.language_name,
          language_code: userLanguage.language_code
        });
        setOriginalLanguage(userLanguage);
      }

      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
      setOriginalProfile({ ...profile });
      onProfileUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Edit Profile
            <Badge variant="secondary" className="ml-2">Men</Badge>
          </DialogTitle>
          <DialogDescription>
            Update your profile information. All 386+ languages supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Protected Fields */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Protected Information (Cannot be changed)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <Input value={userEmail} disabled className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <Input value={profile.phone || ""} disabled className="bg-muted" />
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <Input value={profile.gender || ""} disabled className="bg-muted" />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Profile Photos
            </Label>
            <ProfilePhotosSection userId={currentUserId} />
          </div>

          {/* Language Selection - All 386 Languages */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              Mother Tongue / Primary Language
              <Badge variant="outline" className="ml-1 text-xs">386+ languages</Badge>
            </Label>
            <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {userLanguage ? (
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      {userLanguage.language_name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select your language...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search 386+ languages..." 
                    value={languageSearch}
                    onValueChange={setLanguageSearch}
                  />
                  <CommandList className="max-h-60">
                    <CommandEmpty>No language found.</CommandEmpty>
                    <CommandGroup heading={`🇮🇳 Indian Languages (${INDIAN_LANGUAGES.length})`}>
                      {INDIAN_LANGUAGES
                        .filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
                          (l.nativeName && l.nativeName.toLowerCase().includes(languageSearch.toLowerCase())))
                        .map((lang) => (
                          <CommandItem
                            key={lang.code}
                            value={lang.name}
                            onSelect={() => {
                              setUserLanguage({ language_name: lang.name, language_code: lang.code });
                              setLanguageOpen(false);
                              setLanguageSearch("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", userLanguage?.language_code === lang.code ? "opacity-100" : "opacity-0")} />
                            <span>{lang.name}</span>
                            {lang.nativeName && lang.nativeName !== lang.name && (
                              <span className="text-xs text-muted-foreground ml-1">({lang.nativeName})</span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandGroup heading={`🌍 International Languages (${NON_INDIAN_LANGUAGES.length})`}>
                      {NON_INDIAN_LANGUAGES
                        .filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
                          (l.nativeName && l.nativeName.toLowerCase().includes(languageSearch.toLowerCase())))
                        .map((lang) => (
                          <CommandItem
                            key={lang.code}
                            value={lang.name}
                            onSelect={() => {
                              setUserLanguage({ language_name: lang.name, language_code: lang.code });
                              setLanguageOpen(false);
                              setLanguageSearch("");
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", userLanguage?.language_code === lang.code ? "opacity-100" : "opacity-0")} />
                            <span>{lang.name}</span>
                            {lang.nativeName && lang.nativeName !== lang.name && (
                              <span className="text-xs text-muted-foreground ml-1">({lang.nativeName})</span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name || ""} onChange={(e) => updateField("full_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={profile.date_of_birth || ""} onChange={(e) => updateField("date_of_birth", e.target.value)} />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={profile.country || ""} onValueChange={(v) => updateField("country", v)}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={profile.state || ""} onValueChange={(v) => updateField("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {availableStates.map((s) => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Career */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label><Briefcase className="w-4 h-4 inline mr-1" />Occupation</Label>
              <Input value={profile.occupation || ""} onChange={(e) => updateField("occupation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label><Book className="w-4 h-4 inline mr-1" />Education</Label>
              <Select value={profile.education_level || ""} onValueChange={(v) => updateField("education_level", v)}>
                <SelectTrigger><SelectValue placeholder="Select education" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Physical */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Height (cm)</Label>
              <Input type="number" value={profile.height_cm || ""} onChange={(e) => updateField("height_cm", parseInt(e.target.value) || null)} />
            </div>
            <div className="space-y-2">
              <Label>Body Type</Label>
              <Select value={profile.body_type || ""} onValueChange={(v) => updateField("body_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select body type" /></SelectTrigger>
                <SelectContent>
                  {BODY_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Personal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marital Status</Label>
              <Select value={profile.marital_status || ""} onValueChange={(v) => updateField("marital_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Religion</Label>
              <Select value={profile.religion || ""} onValueChange={(v) => updateField("religion", v)}>
                <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
                <SelectContent>
                  {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>About Me</Label>
            <Textarea 
              value={profile.bio || ""} 
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenProfileEditDialog;
