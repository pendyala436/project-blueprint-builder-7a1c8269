/**
 * ProfilePhotosSection Component
 * 
 * Allows users to upload a selfie and up to 5 additional photos.
 * At least one photo is mandatory for all users.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, X, Loader2, ImagePlus, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserPhoto {
  id: string;
  photo_url: string;
  photo_type: 'selfie' | 'additional';
  display_order: number;
  is_primary: boolean;
}

interface ProfilePhotosSectionProps {
  userId: string;
  onPhotosChange?: (hasPhotos: boolean) => void;
}

const MAX_ADDITIONAL_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ProfilePhotosSection = ({ userId, onPhotosChange }: ProfilePhotosSectionProps) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<'selfie' | 'additional' | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // Load existing photos
  useEffect(() => {
    loadPhotos();
  }, [userId]);

  // Notify parent about photo status
  useEffect(() => {
    onPhotosChange?.(photos.length > 0);
  }, [photos, onPhotosChange]);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("user_photos")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPhotos((data as UserPhoto[]) || []);
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadPhoto = async (file: File, type: 'selfie' | 'additional') => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setUploadingType(type);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(fileName);

      // Determine display order
      const existingOfType = photos.filter(p => p.photo_type === type);
      const displayOrder = existingOfType.length;

      // If this is a selfie and one already exists, delete the old one
      if (type === 'selfie') {
        const existingSelfie = photos.find(p => p.photo_type === 'selfie');
        if (existingSelfie) {
          await deletePhoto(existingSelfie.id, existingSelfie.photo_url);
        }
      }

      // Save to database
      const { data: newPhoto, error: dbError } = await supabase
        .from("user_photos")
        .insert({
          user_id: userId,
          photo_url: publicUrl,
          photo_type: type,
          display_order: displayOrder,
          is_primary: photos.length === 0, // First photo is primary
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update profile photo_url if this is the first photo or selfie
      if (photos.length === 0 || type === 'selfie') {
        await supabase
          .from("profiles")
          .update({ photo_url: publicUrl })
          .eq("user_id", userId);
      }

      // Reload photos
      await loadPhotos();

      toast({
        title: "Photo uploaded",
        description: type === 'selfie' ? "Selfie uploaded successfully" : "Photo added to your profile",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingType(null);
    }
  };

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split("/profile-photos/");
      if (urlParts[1]) {
        await supabase.storage
          .from("profile-photos")
          .remove([urlParts[1]]);
      }

      // Delete from database
      await supabase
        .from("user_photos")
        .delete()
        .eq("id", photoId);

      // Reload photos
      await loadPhotos();
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw error;
    }
  };

  const handleDeletePhoto = async (photo: UserPhoto) => {
    try {
      await deletePhoto(photo.id, photo.photo_url);

      // If this was the primary photo, set another as primary
      if (photo.is_primary && photos.length > 1) {
        const nextPhoto = photos.find(p => p.id !== photo.id);
        if (nextPhoto) {
          await supabase
            .from("user_photos")
            .update({ is_primary: true })
            .eq("id", nextPhoto.id);
          
          await supabase
            .from("profiles")
            .update({ photo_url: nextPhoto.photo_url })
            .eq("user_id", userId);
        }
      }

      toast({
        title: "Photo deleted",
        description: "Photo removed from your profile",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const setPrimaryPhoto = async (photo: UserPhoto) => {
    try {
      // Remove primary from all
      await supabase
        .from("user_photos")
        .update({ is_primary: false })
        .eq("user_id", userId);

      // Set new primary
      await supabase
        .from("user_photos")
        .update({ is_primary: true })
        .eq("id", photo.id);

      // Update profile photo_url
      await supabase
        .from("profiles")
        .update({ photo_url: photo.photo_url })
        .eq("user_id", userId);

      await loadPhotos();

      toast({
        title: "Primary photo updated",
        description: "This photo will be shown as your main profile picture",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update primary photo",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'selfie' | 'additional') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file, type);
    }
    e.target.value = ''; // Reset input
  };

  const selfiePhoto = photos.find(p => p.photo_type === 'selfie');
  const additionalPhotos = photos.filter(p => p.photo_type === 'additional');
  const canAddMore = additionalPhotos.length < MAX_ADDITIONAL_PHOTOS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selfie Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Profile Selfie
            <span className="text-destructive">*</span>
          </label>
          {photos.length === 0 && (
            <span className="text-xs text-destructive">At least one photo required</span>
          )}
        </div>
        
        <input
          ref={selfieInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'selfie')}
        />

        {selfiePhoto ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-primary">
            <img
              src={selfiePhoto.photo_url}
              alt="Selfie"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="w-8 h-8"
                onClick={() => selfieInputRef.current?.click()}
                disabled={uploadingType !== null}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="w-8 h-8"
                onClick={() => handleDeletePhoto(selfiePhoto)}
                disabled={photos.length === 1}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {selfiePhoto.is_primary && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                <Star className="w-3 h-3 fill-current" />
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-32 h-32 rounded-xl border-dashed flex flex-col gap-2"
            onClick={() => selfieInputRef.current?.click()}
            disabled={uploadingType !== null}
          >
            {uploadingType === 'selfie' ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Selfie</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Additional Photos Section */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <ImagePlus className="w-4 h-4" />
          Additional Photos
          <span className="text-muted-foreground text-xs">(Optional, max 5)</span>
        </label>

        <input
          ref={additionalInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e, 'additional')}
        />

        <div className="flex flex-wrap gap-3">
          {additionalPhotos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                "relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors",
                photo.is_primary ? "border-primary" : "border-border"
              )}
            >
              <img
                src={photo.photo_url}
                alt="Additional"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-6 h-6"
                  onClick={() => setPrimaryPhoto(photo)}
                  title="Set as primary"
                >
                  <Star className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="w-6 h-6"
                  onClick={() => handleDeletePhoto(photo)}
                  disabled={photos.length === 1}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {photo.is_primary && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Star className="w-2 h-2 fill-current" />
                </div>
              )}
            </div>
          ))}

          {canAddMore && (
            <Button
              variant="outline"
              className="w-20 h-20 rounded-lg border-dashed flex flex-col gap-1"
              onClick={() => additionalInputRef.current?.click()}
              disabled={uploadingType !== null}
            >
              {uploadingType === 'additional' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Add</span>
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {additionalPhotos.length}/{MAX_ADDITIONAL_PHOTOS} additional photos • Click star to set as primary
        </p>
      </div>
    </div>
  );
};

export default ProfilePhotosSection;
