/**
 * ProfileEditDialog Component
 * 
 * A reusable dialog component for editing user profile information.
 * Protected fields (mobile, email, gender) are displayed but not editable.
 * 
 * @module components/ProfileEditDialog
 */

import { useState, useEffect } from "react";
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
import { Loader2, Lock, User, Calendar, MapPin, Briefcase, Book, Heart, Phone, Camera } from "lucide-react";
import PhoneInputWithCode from "@/components/PhoneInputWithCode";
import { countries } from "@/data/countries";
import { statesByCountry, State } from "@/data/states";
import ProfilePhotosSection from "@/components/ProfilePhotosSection";
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
}

/**
 * Props for the ProfileEditDialog component
 */
interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
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

const ProfileEditDialog = ({ open, onOpenChange, onProfileUpdated }: ProfileEditDialogProps) => {
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
  });
  
  // User email from auth (protected field)
  const [userEmail, setUserEmail] = useState<string>("");
  
  // Current user ID
  const [currentUserId, setCurrentUserId] = useState<string>("");
  
  // Has at least one photo
  const [hasPhotos, setHasPhotos] = useState(true);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Available states based on selected country
  const [availableStates, setAvailableStates] = useState<State[]>([]);
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

      // Fetch profile data from database
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Update state with fetched data
      if (data) {
        setProfile({
          full_name: data.full_name,
          phone: data.phone,
          gender: data.gender,
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
        });
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

      // Update profile - excluding protected field (email only)
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          gender: profile.gender,
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
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

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
                  onPhotosChange={setHasPhotos}
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
                disabled={isSaving || !hasPhotos}
                title={!hasPhotos ? "At least one photo is required" : ""}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
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
