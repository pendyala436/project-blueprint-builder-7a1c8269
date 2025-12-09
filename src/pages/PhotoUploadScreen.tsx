import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Camera, Check, X, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";

type VerificationState = "idle" | "verifying" | "verified" | "failed";

const MAX_ADDITIONAL_PHOTOS = 5;

const PhotoUploadScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Selfie state (first photo with AI verification)
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Additional photos state
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelfieCapture = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setVerificationState("idle");
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelfiePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAdditionalPhoto = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    if (additionalPhotos.length >= MAX_ADDITIONAL_PHOTOS) {
      toast({
        title: "Maximum photos reached",
        description: `You can only add ${MAX_ADDITIONAL_PHOTOS} additional photos`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAdditionalPhotos(prev => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(file);
  }, [additionalPhotos.length]);

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAdditionalPhoto(file);
  }, [handleAdditionalPhoto]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a selfie",
        variant: "destructive",
      });
    }
  };

  // Set video source when stream and video element are ready
  useEffect(() => {
    if (stream && videoRef.current && showCamera) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showCamera]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
            handleSelfieCapture(file);
            stopCamera();
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const verifySelfie = async () => {
    if (!selfiePreview) return;

    setVerificationState("verifying");

    // Helper to auto-accept photo (keeps existing gender)
    const autoAccept = (detectedGender?: string) => {
      // Update gender if detected
      if (detectedGender && (detectedGender === 'male' || detectedGender === 'female')) {
        const currentGender = localStorage.getItem("userGender");
        if (currentGender !== detectedGender) {
          localStorage.setItem("userGender", detectedGender);
          toast({
            title: "Gender updated",
            description: `Based on your photo, gender set to ${detectedGender}`,
          });
        }
      }
      
      setVerificationState("verified");
      setVerificationResult({ reason: "Photo accepted", detectedGender });
      toast({
        title: "Photo accepted",
        description: "Your photo has been saved",
      });
    };

    try {
      let data: any = null;
      let error: any = null;

      try {
        const result = await supabase.functions.invoke("verify-photo", {
          body: {
            imageBase64: selfiePreview,
            expectedGender: localStorage.getItem("userGender") || null
          }
        });
        data = result.data;
        error = result.error;
        
        // Check if the response contains an error (402, credits exhausted, etc.)
        if (data?.error) {
          console.log("Edge function returned error in data:", data.error);
          autoAccept();
          return;
        }
      } catch (invokeError: any) {
        // Edge function invoke failed - auto accept
        console.log("Invoke error, auto-accepting:", invokeError);
        autoAccept();
        return;
      }

      // Handle any edge function errors - auto-accept to not block registration
      if (error) {
        console.log("Edge function error:", error);
        autoAccept();
        return;
      }

      // Normal verification response
      if (!data || data.verified === undefined) {
        autoAccept();
        return;
      }

      // Update gender based on AI detection
      if (data.detectedGender && (data.detectedGender === 'male' || data.detectedGender === 'female')) {
        const currentGender = localStorage.getItem("userGender");
        if (currentGender !== data.detectedGender) {
          localStorage.setItem("userGender", data.detectedGender);
          toast({
            title: "Gender detected",
            description: `AI detected gender as ${data.detectedGender}`,
          });
        }
      }

      setVerificationResult(data);
      
      if (data.verified) {
        setVerificationState("verified");
        toast({
          title: "Selfie verified!",
          description: "Your identity has been successfully verified",
        });
      } else {
        setVerificationState("failed");
        toast({
          title: "Verification issue",
          description: data.reason || "Please try taking a clearer selfie",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      // On any error, auto-accept to prevent blocking registration
      autoAccept();
    }
  };

  const handleNext = () => {
    if (verificationState !== "verified") {
      toast({
        title: "Selfie not verified",
        description: "Please verify your selfie before continuing",
        variant: "destructive",
      });
      return;
    }

    // Store photo data for later upload (after auth)
    if (selfiePreview) {
      localStorage.setItem("pendingPhotoData", selfiePreview);
    }
    if (additionalPhotos.length > 0) {
      localStorage.setItem("pendingAdditionalPhotos", JSON.stringify(additionalPhotos));
    }

    toast({
      title: "Photos saved!",
      description: "Your photos have been saved",
    });
    
    navigate("/location-setup");
  };

  const handleBack = () => {
    stopCamera();
    navigate("/password-setup");
  };

  const clearSelfie = () => {
    setSelfiePreview(null);
    setVerificationState("idle");
    setVerificationResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ProgressIndicator currentStep={4} totalSteps={9} />
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 pb-8 overflow-y-auto">
        <MeowLogo size="md" className="mb-4" />
        
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
          Add Your Photos
        </h1>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          Take a selfie for verification, then add more photos
        </p>

        {/* Camera View */}
        {showCamera && (
          <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-[60vh] rounded-2xl border-2 border-primary/20"
              />
              <div className="absolute inset-0 border-4 border-primary/30 rounded-2xl pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-dashed border-primary/50 rounded-full" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 mb-2">
              Position your face in the circle
            </p>
            <div className="flex gap-4 mt-4">
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
              <Button onClick={capturePhoto} className="gap-2">
                <Camera className="h-4 w-4" />
                Take Selfie
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Selfie Section */}
        <Card className="w-full max-w-sm p-4 bg-card/50 backdrop-blur-sm border-border/50 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Selfie for Verification</h2>
            {verificationState === "verified" && (
              <span className="ml-auto text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> Verified
              </span>
            )}
          </div>

          {!selfiePreview ? (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed border-2 gap-2 flex-col"
              onClick={startCamera}
            >
              <Camera className="h-8 w-8 text-primary" />
              <span>Take a Selfie</span>
            </Button>
          ) : (
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden aspect-square animate-in fade-in duration-500">
                <img
                  src={selfiePreview}
                  alt="Selfie preview"
                  className="w-full h-full object-cover"
                />
                
                {verificationState === "verifying" && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                      <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      AI Verification in progress...
                    </p>
                  </div>
                )}

                {verificationState === "verified" && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-2 animate-in zoom-in duration-300">
                    <Check className="h-5 w-5" />
                  </div>
                )}

                {verificationState === "failed" && (
                  <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground rounded-full p-2 animate-in zoom-in duration-300">
                    <X className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={clearSelfie}
                >
                  Retake
                </Button>
                {verificationState !== "verified" && (
                  <Button
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={verifySelfie}
                    disabled={verificationState === "verifying"}
                  >
                    {verificationState === "verifying" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Verify
                      </>
                    )}
                  </Button>
                )}
              </div>

              {verificationResult && verificationState !== "verifying" && (
                <div className={`
                  mt-3 p-2 rounded-lg text-xs
                  ${verificationState === "verified" 
                    ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                    : "bg-destructive/10 text-destructive"
                  }
                `}>
                  {verificationResult.reason}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Additional Photos Section */}
        <Card className="w-full max-w-sm p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Additional Photos</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {additionalPhotos.length}/{MAX_ADDITIONAL_PHOTOS}
            </span>
          </div>

          <input
            ref={additionalFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAdditionalPhoto(file);
              e.target.value = "";
            }}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-2">
            {additionalPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden group animate-in fade-in duration-300">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeAdditionalPhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}

            {additionalPhotos.length < MAX_ADDITIONAL_PHOTOS && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => additionalFileInputRef.current?.click()}
                className={`
                  aspect-square rounded-lg border-2 border-dashed flex items-center justify-center
                  cursor-pointer transition-all duration-200
                  ${isDragging 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }
                `}
              >
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Add up to {MAX_ADDITIONAL_PHOTOS} more photos to your profile
          </p>
        </Card>

        {/* Continue Button */}
        <Button
          variant="aurora"
          className="w-full max-w-sm mt-6"
          size="lg"
          onClick={handleNext}
          disabled={verificationState !== "verified"}
        >
          Continue
        </Button>
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default PhotoUploadScreen;
