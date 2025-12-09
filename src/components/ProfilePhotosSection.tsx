/**
 * ProfilePhotosSection Component
 * 
 * Allows users to upload a selfie (with AI gender verification) and up to 5 additional photos.
 * At least one photo is mandatory for all users.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFaceVerification } from "@/hooks/useFaceVerification";
import { Camera, Upload, X, Loader2, ImagePlus, Star, ShieldCheck, AlertCircle } from "lucide-react";
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
  expectedGender?: 'male' | 'female';
  onPhotosChange?: (hasPhotos: boolean) => void;
  onGenderVerified?: (gender: string) => void;
}

const MAX_ADDITIONAL_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ProfilePhotosSection = ({ userId, expectedGender, onPhotosChange, onGenderVerified }: ProfilePhotosSectionProps) => {
  const { toast } = useToast();
  const { verifyFace, isVerifying: isFaceVerifying } = useFaceVerification();
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<'selfie' | 'additional' | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);
  const [detectedGender, setDetectedGender] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Combined verifying state
  const isVerifying = isFaceVerifying;

  // Load existing photos and check verification status
  useEffect(() => {
    loadPhotos();
    loadVerificationStatus();
  }, [userId]);

  // Notify parent about photo status
  useEffect(() => {
    onPhotosChange?.(photos.length > 0);
  }, [photos, onPhotosChange]);

  const loadVerificationStatus = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("verification_status, gender")
        .eq("user_id", userId)
        .single();
      
      if (data) {
        setVerificationStatus(data.verification_status ? 'verified' : 'pending');
        if (data.gender) {
          setDetectedGender(data.gender);
        }
      }
    } catch (error) {
      console.error("Error loading verification status:", error);
    }
  };

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
      // For selfie, first verify gender using in-browser AI
      if (type === 'selfie') {
        // Convert file to base64 for verification
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const imageBase64 = await base64Promise;

        // Use in-browser face verification with expected gender
        const verifyData = await verifyFace(imageBase64, expectedGender);

        if (!verifyData.hasFace) {
          toast({
            title: "No face detected",
            description: "Please upload a clear selfie showing your face.",
            variant: "destructive",
          });
          setUploadingType(null);
          return;
        }

        // Check for gender mismatch if expected gender was provided
        if (expectedGender && verifyData.genderMatches === false) {
          toast({
            title: "Gender mismatch",
            description: `This profile requires a ${expectedGender} selfie. Detected: ${verifyData.detectedGender}`,
            variant: "destructive",
          });
          setVerificationStatus('failed');
          setUploadingType(null);
          return;
        }

        // Use expected gender if provided and detection was uncertain
        const gender = expectedGender || (verifyData.detectedGender?.toLowerCase() as 'male' | 'female') || 'unknown';
        setDetectedGender(gender);
        setVerificationStatus(verifyData.verified ? 'verified' : 'failed');

        // Update only the specific gender profile (not the main profiles table for gender)
        if (expectedGender === 'male') {
          const { data: existingMale } = await supabase
            .from("male_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingMale) {
            await supabase
              .from("male_profiles")
              .update({ is_verified: verifyData.verified })
              .eq("user_id", userId);
          }
        } else if (expectedGender === 'female') {
          const { data: existingFemale } = await supabase
            .from("female_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingFemale) {
            await supabase
              .from("female_profiles")
              .update({ is_verified: verifyData.verified })
              .eq("user_id", userId);
          }
        }

        onGenderVerified?.(gender);

        toast({
          title: verifyData.verified ? "Verification successful" : "Verification complete",
          description: `Gender verified: ${gender}${verifyData.verified ? " ✓" : ""}`,
        });
      }

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
        title: type === 'selfie' ? "Selfie uploaded" : "Photo added",
        description: type === 'selfie' ? "Your selfie has been verified and saved" : "Photo added to your profile",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file, 'additional');
    }
    e.target.value = ''; // Reset input
  };

  // Check if camera is available
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're in an iframe (preview environment) where camera may be blocked
    const isInIframe = window.self !== window.top;
    
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraAvailable(false);
      return;
    }

    // In iframe environments, camera is often blocked - default to upload
    if (isInIframe) {
      setCameraAvailable(false);
      return;
    }

    setCameraAvailable(true);
  }, []);

  // Camera functions for live selfie
  const startCamera = async () => {
    // If camera not available, show error
    if (cameraAvailable === false) {
      toast({
        title: "Camera required",
        description: "Selfie must be taken using camera for verification. Please enable camera access.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraAvailable(false);
      toast({
        title: "Camera not available",
        description: "Please enable camera access in your browser settings to take a selfie.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and upload
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        uploadPhoto(file, 'selfie');
      }
    }, 'image/jpeg', 0.9);
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
      {/* Gender Verification Status */}
      {detectedGender && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          verificationStatus === 'verified' 
            ? "bg-green-500/10 border border-green-500/30" 
            : "bg-yellow-500/10 border border-yellow-500/30"
        )}>
          {verificationStatus === 'verified' ? (
            <ShieldCheck className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              Gender: <span className="capitalize">{detectedGender}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {verificationStatus === 'verified' 
                ? "Verified via AI selfie analysis" 
                : "Upload a clear selfie for verification"}
            </p>
          </div>
          {verificationStatus === 'verified' && (
            <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
              Verified
            </Badge>
          )}
        </div>
      )}

      {/* Selfie Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Profile Selfie (Gender Verification)
            <span className="text-destructive">*</span>
          </label>
          {photos.length === 0 && (
            <span className="text-xs text-destructive">At least one photo required</span>
          )}
        </div>
        

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
                onClick={startCamera}
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
        ) : showCamera ? (
          <div className="space-y-3">
            <div className="relative w-48 h-36 rounded-xl overflow-hidden border-2 border-primary bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={capturePhoto}
                disabled={uploadingType !== null}
              >
                <Camera className="w-4 h-4 mr-1" />
                Capture
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={stopCamera}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {uploadingType === 'selfie' || isVerifying ? (
              <div className="h-32 w-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs text-muted-foreground">
                  {isVerifying ? "Verifying..." : "Uploading..."}
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-32 w-32 rounded-xl border-dashed flex flex-col gap-2"
                onClick={startCamera}
                disabled={uploadingType !== null || isVerifying}
              >
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Take Selfie</span>
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Use camera to take a live selfie for AI verification
            </p>
          </div>
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
          onChange={handleFileChange}
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
