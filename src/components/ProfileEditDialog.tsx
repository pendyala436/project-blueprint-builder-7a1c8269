/**
 * ProfileEditDialog Component
 * 
 * A reusable dialog component for editing user profile information.
 * Protected fields (mobile, email, gender) are displayed but not editable.
 * 
 * @module components/ProfileEditDialog
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
import { Loader2, Lock, User, Calendar, MapPin, Briefcase, Book, Heart, Phone, Camera, Languages, Globe, Check, ChevronsUpDown, KeyRound } from "lucide-react";
import PhoneInputWithCode from "@/components/PhoneInputWithCode";
import { countries } from "@/data/countries";
import { statesByCountry, State } from "@/data/states";
import ProfilePhotosSection from "@/components/ProfilePhotosSection";
import { ALL_NLLB200_LANGUAGES, INDIAN_NLLB200_LANGUAGES, NON_INDIAN_NLLB200_LANGUAGES } from "@/data/nllb200Languages";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
// ==================== Type Definitions ====================

/**
 * Profile data structure matching the database schema
 */
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
  primary_language: string | null;
}

/**
 * User language data for matching
 */
interface UserLanguage {
  language_name: string;
  language_code: string;
}

/**
 * Props for the ProfileEditDialog component
 */
interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
  /** Specify which profile table to use - 'male' or 'female'. If not provided, uses main profiles table */
  profileType?: 'male' | 'female';
}

// ==================== Constants ====================

/**
 * Education level options for dropdown
 */
const EDUCATION_LEVELS = [
  "High School",
  "Some College",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Professional Degree",
  "Other"
];

/**
 * Body type options for dropdown
 */
const BODY_TYPES = [
  "Slim",
  "Athletic",
  "Average",
  "Curvy",
  "Plus Size"
];

/**
 * Marital status options for dropdown
 */
const MARITAL_STATUSES = [
  "Single",
  "Married",
  "Divorced",
  "Widowed",
  "Separated"
];

/**
 * Religion options for dropdown
 */
const RELIGIONS = [
  "Hindu",
  "Muslim",
  "Christian",
  "Sikh",
  "Buddhist",
  "Jain",
  "Jewish",
  "Other",
  "Prefer not to say"
];

// ==================== Component ====================

const ProfileEditDialog = ({ open, onOpenChange, onProfileUpdated, profileType }: ProfileEditDialogProps) => {
  const { toast } = useToast();
  
  // State for profile data
  const [profile, setProfile] = useState<ProfileData>({
    full_name: null,
    phone: null,
    gender: null,
    date_of_birth: null,
    country: null,
    state: null,
    bio: null,
    occupation: null,
    education_level: null,
    height_cm: null,
    body_type: null,
    marital_status: null,
    religion: null,
    interests: null,
    primary_language: null,
  });
  
  // Original profile data to track changes
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState<UserLanguage | null>(null);
  
  // User's selected language for matching
  const [userLanguage, setUserLanguage] = useState<UserLanguage | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  
  // User email from auth (protected field)
  const [userEmail, setUserEmail] = useState<string>("");
  
  // Current user ID
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Has at least one photo
  const [hasPhotos, setHasPhotos] = useState(true);
  
  // Track if photos were changed (photos save automatically, but we track for UI feedback)
  const [photosChanged, setPhotosChanged] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Available states based on selected country
  const [availableStates, setAvailableStates] = useState<State[]>([]);
  
  // Check if there are any changes - use useMemo for reactivity
  const hasChanges = useMemo(() => {
    if (!originalProfile) return false;
    
    // Check profile fields
    const profileChanged = Object.keys(profile).some(key => {
      const k = key as keyof ProfileData;
      const current = profile[k];
      const original = originalProfile[k];
      
      // Handle null/undefined normalization
      const normalizedCurrent = current === undefined ? null : current;
      const normalizedOriginal = original === undefined ? null : original;
      
      // Handle arrays
      if (Array.isArray(normalizedCurrent) && Array.isArray(normalizedOriginal)) {
        return JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
      }
      
      // Handle null comparisons
      if (normalizedCurrent === null && normalizedOriginal === null) {
        return false;
      }
      
      return normalizedCurrent !== normalizedOriginal;
    });
    
    // Check language change - explicit null checks
    const currentLangCode = userLanguage?.language_code ?? '';
    const originalLangCode = originalLanguage?.language_code ?? '';
    const languageChanged = currentLangCode !== originalLangCode;
    
    return profileChanged || languageChanged;
  }, [profile, originalProfile, userLanguage, originalLanguage]);
  // ==================== Effects ====================

  /**
   * Load profile data when dialog opens
   */
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  /**
   * Update available states when country changes
   */
  useEffect(() => {
    // Find the country code from the country name
    const countryData = countries.find(c => c.name === profile.country);
    if (countryData && statesByCountry[countryData.code]) {
      setAvailableStates(statesByCountry[countryData.code]);
    } else {
      setAvailableStates([]);
    }
  }, [profile.country]);

  // ==================== Data Fetching ====================

  /**
   * Load the current user's profile from Supabase
   */
  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set user ID and email
      setCurrentUserId(user.id);
      setUserEmail(user.email || "");

      let data: any = null;

      // Fetch profile data from the appropriate table based on profileType
      if (profileType === 'male') {
        const { data: maleData, error } = await supabase
          .from("male_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        data = maleData;
      } else if (profileType === 'female') {
        const { data: femaleData, error } = await supabase
          .from("female_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        data = femaleData;
      } else {
        // Fallback to main profiles table
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        data = profileData;
      }

      // Get language from the profile data itself (stored in primary_language/preferred_language)
      // Each profile type has its own language stored independently
      if (data && data.primary_language) {
        // Find the language in our list to get the code
        const foundLang = ALL_NLLB200_LANGUAGES.find(l => l.name === data.primary_language);
        if (foundLang) {
          const langData = {
            language_name: foundLang.name,
            language_code: foundLang.code
          };
          setUserLanguage(langData);
          setOriginalLanguage(langData);
        } else {
          // Language name exists but not in our list - use it anyway
          setUserLanguage({ language_name: data.primary_language, language_code: data.primary_language });
          setOriginalLanguage({ language_name: data.primary_language, language_code: data.primary_language });
        }
      } else {
        setUserLanguage(null);
        setOriginalLanguage(null);
      }

      // Update state with fetched data
      if (data) {
        const profileData: ProfileData = {
          full_name: data.full_name,
          phone: data.phone,
          gender: profileType || data.gender,
          date_of_birth: data.date_of_birth,
          country: data.country,
          state: data.state,
          bio: data.bio,
          occupation: data.occupation,
          education_level: data.education_level,
          height_cm: data.height_cm,
          body_type: data.body_type,
          marital_status: data.marital_status,
          religion: data.religion,
          interests: data.interests,
          primary_language: data.primary_language,
        };
        setProfile(profileData);
        setOriginalProfile(profileData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Event Handlers ====================

  /**
   * Handle saving profile changes to database
   * Protected fields (phone, gender) are NOT sent to update
   */
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const profileData = {
        full_name: profile.full_name,
        phone: profile.phone,
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
        primary_language: userLanguage?.language_name || profile.primary_language,
        preferred_language: userLanguage?.language_name || profile.primary_language,
        updated_at: new Date().toISOString(),
      };

      // Save to the appropriate table based on profileType
      if (profileType === 'male') {
        const { data: existingMale } = await supabase
          .from("male_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingMale) {
          const { error } = await supabase
            .from("male_profiles")
            .update(profileData)
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("male_profiles")
            .insert({ user_id: user.id, ...profileData });
          if (error) throw error;
        }
      } else if (profileType === 'female') {
        const { data: existingFemale } = await supabase
          .from("female_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingFemale) {
          const { error } = await supabase
            .from("female_profiles")
            .update(profileData)
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("female_profiles")
            .insert({ user_id: user.id, ...profileData });
          if (error) throw error;
        }
      } else {
        // Fallback: update main profiles table
        const { error } = await supabase
          .from("profiles")
          .update({
            ...profileData,
            gender: profile.gender,
          })
          .eq("user_id", user.id);
        if (error) throw error;
      }

      // Also update user_languages table to trigger real-time subscription for dashboard refresh
      if (userLanguage && userLanguage.language_name) {
        console.log("[ProfileEditDialog] Updating user_languages to:", userLanguage.language_name, userLanguage.language_code);
        
        // Delete existing and insert new to ensure proper realtime trigger
        await supabase
          .from("user_languages")
          .delete()
          .eq("user_id", user.id);
        
        const { error: langInsertError } = await supabase
          .from("user_languages")
          .insert({
            user_id: user.id,
            language_name: userLanguage.language_name,
            language_code: userLanguage.language_code
          });
        
        if (langInsertError) {
          console.error("[ProfileEditDialog] Error updating user_languages:", langInsertError);
        } else {
          console.log("[ProfileEditDialog] Successfully updated user_languages");
        }

        // Update original language to reflect saved state
        setOriginalLanguage({
          language_name: userLanguage.language_name,
          language_code: userLanguage.language_code
        });
      }

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully",
      });

      // Notify parent component
      onProfileUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Update a specific field in the profile state
   */
  const updateField = <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // ==================== Render ====================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your profile information. Some fields cannot be changed for security reasons.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* ==================== Protected Fields Section ==================== */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                This field cannot be changed
              </p>

              {/* Email - Protected */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <Input
                  value={userEmail}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            {/* ==================== Profile Photos Section ==================== */}
            {currentUserId && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="w-4 h-4" />
                  Profile Photos
                </div>
                <ProfilePhotosSection 
                  userId={currentUserId}
                  expectedGender={profileType}
                  onPhotosChange={(hasAnyPhotos) => {
                    setHasPhotos(hasAnyPhotos);
                    setPhotosChanged(true);
                  }}
                />
              </div>
            )}

            {/* ==================== Editable Fields Section ==================== */}
            
            {/* Mobile Number - Editable */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Mobile Number
              </Label>
              <PhoneInputWithCode
                value={profile.phone || ""}
                onChange={(value) => updateField("phone", value)}
                placeholder="Enter your phone number"
                defaultCountryCode="IN"
              />
            </div>

            {/* Gender - Editable */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Gender
              </Label>
              <Select
                value={profile.gender || ""}
                onValueChange={(value) => updateField("gender", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ==================== Editable Fields Section ==================== */}
            
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input
                id="full_name"
                value={profile.full_name || ""}
                onChange={(e) => updateField("full_name", e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="dob" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Birth
              </Label>
              <Input
                id="dob"
                type="date"
                value={profile.date_of_birth || ""}
                onChange={(e) => updateField("date_of_birth", e.target.value)}
              />
            </div>

            {/* Country & State Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Country
                </Label>
                <Select
                  value={profile.country || ""}
                  onValueChange={(value) => {
                    updateField("country", value);
                    updateField("state", null); // Reset state when country changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.flag} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Select
                  value={profile.state || ""}
                  onValueChange={(value) => updateField("state", value)}
                  disabled={!availableStates.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                <SelectContent>
                    {availableStates.map((state) => (
                      <SelectItem key={state.code} value={state.name}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ==================== Language Selection (for Matching) ==================== */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Languages className="w-4 h-4 text-primary" />
                My Language (for Chat Matching)
              </Label>
              <p className="text-xs text-muted-foreground">
                Select your primary language. You will be matched with users speaking the same language. Auto-translation is available for 200+ languages.
              </p>
              
              <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={languageOpen}
                    className="w-full justify-between bg-background"
                  >
                    {userLanguage ? (
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        {userLanguage.language_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select your language...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                  <Command className="bg-popover">
                    <CommandInput 
                      placeholder="Search language..." 
                      value={languageSearch}
                      onValueChange={setLanguageSearch}
                    />
                    <CommandList className="max-h-60">
                      <CommandEmpty>No language found.</CommandEmpty>
                      
                      {/* Indian Languages */}
                      <CommandGroup heading="🇮🇳 Indian Languages">
                        {INDIAN_NLLB200_LANGUAGES
                          .filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()))
                          .map((lang) => (
                            <CommandItem
                              key={lang.code}
                              value={lang.name}
                              onSelect={() => {
                                setUserLanguage({
                                  language_name: lang.name,
                                  language_code: lang.code
                                });
                                setLanguageOpen(false);
                                setLanguageSearch("");
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-4 w-4", userLanguage?.language_code === lang.code ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1">{lang.name}</span>
                              <span className="text-xs text-muted-foreground">{lang.script}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>

                      {/* International Languages */}
                      <CommandGroup heading="🌍 International Languages">
                        {NON_INDIAN_NLLB200_LANGUAGES
                          .filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()))
                          .slice(0, 30)
                          .map((lang) => (
                            <CommandItem
                              key={lang.code}
                              value={lang.name}
                              onSelect={() => {
                                setUserLanguage({
                                  language_name: lang.name,
                                  language_code: lang.code
                                });
                                setLanguageOpen(false);
                                setLanguageSearch("");
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn("mr-2 h-4 w-4", userLanguage?.language_code === lang.code ? "opacity-100" : "opacity-0")} />
                              <span className="flex-1">{lang.name}</span>
                              <span className="text-xs text-muted-foreground">{lang.script}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {userLanguage && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    Auto-translation enabled
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Connect with users in any language
                  </span>
                </div>
              )}
            </div>

            {/* Occupation */}
            <div className="space-y-2">
              <Label htmlFor="occupation" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Occupation
              </Label>
              <Input
                id="occupation"
                value={profile.occupation || ""}
                onChange={(e) => updateField("occupation", e.target.value)}
                placeholder="Enter your occupation"
              />
            </div>

            {/* Education Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                Education Level
              </Label>
              <Select
                value={profile.education_level || ""}
                onValueChange={(value) => updateField("education_level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Physical Attributes Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Height */}
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.height_cm || ""}
                  onChange={(e) => updateField("height_cm", e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 170"
                  min={100}
                  max={250}
                />
              </div>

              {/* Body Type */}
              <div className="space-y-2">
                <Label>Body Type</Label>
                <Select
                  value={profile.body_type || ""}
                  onValueChange={(value) => updateField("body_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Personal Details Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Marital Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Marital Status
                </Label>
                <Select
                  value={profile.marital_status || ""}
                  onValueChange={(value) => updateField("marital_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Religion */}
              <div className="space-y-2">
                <Label>Religion</Label>
                <Select
                  value={profile.religion || ""}
                  onValueChange={(value) => updateField("religion", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select religion" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((religion) => (
                      <SelectItem key={religion} value={religion}>
                        {religion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">About Me</Label>
              <Textarea
                id="bio"
                value={profile.bio || ""}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {(profile.bio?.length || 0)}/500 characters
              </p>
            </div>

            {/* ==================== Password Reset Section ==================== */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Reset Password</Label>
                    <p className="text-xs text-muted-foreground">
                      Send a password reset link to your email
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!userEmail) return;
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
                        redirectTo: `${window.location.origin}/password-reset`,
                      });
                      if (error) throw error;
                      toast({
                        title: "Reset Email Sent",
                        description: "Check your email for the password reset link",
                      });
                    } catch (error) {
                      console.error("Error sending reset email:", error);
                      toast({
                        title: "Error",
                        description: "Failed to send reset email. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {/* ==================== Action Buttons ==================== */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || (!hasChanges && !photosChanged)}
                title={!hasChanges && !photosChanged ? "No changes to save" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : photosChanged && !hasChanges ? (
                  "Close"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditDialog;
