import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Camera, Check, X, Loader2, Sparkles } from "lucide-react";

type VerificationState = "idle" | "uploading" | "verifying" | "verified" | "failed";

const PhotoUploadScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
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

    setPhotoFile(file);
    setVerificationState("idle");
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a photo",
        variant: "destructive",
      });
    }
  };

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
            const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
            handleFileSelect(file);
            stopCamera();
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const verifyPhoto = async () => {
    if (!photoPreview) return;

    setVerificationState("verifying");

    try {
      const { data, error } = await supabase.functions.invoke("verify-photo", {
        body: {
          imageBase64: photoPreview,
          expectedGender: localStorage.getItem("userGender") || null
        }
      });

      if (error) throw error;

      setVerificationResult(data);
      
      if (data.verified) {
        setVerificationState("verified");
        toast({
          title: "Photo verified!",
          description: "Your photo has been successfully verified",
        });
      } else {
        setVerificationState("failed");
        toast({
          title: "Verification issue",
          description: data.reason || "Please try uploading a clearer photo",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setVerificationState("failed");
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleNext = () => {
    if (verificationState !== "verified") {
      toast({
        title: "Photo not verified",
        description: "Please verify your photo before continuing",
        variant: "destructive",
      });
      return;
    }

    // Store photo data for later upload (after auth)
    if (photoPreview) {
      localStorage.setItem("pendingPhotoData", photoPreview);
    }

    toast({
      title: "Photo saved!",
      description: "Your verified photo has been saved",
    });
    
    navigate("/password-setup");
  };

  const handleBack = () => {
    stopCamera();
    navigate("/basic-info");
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
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
        <ProgressIndicator currentStep={4} totalSteps={5} />
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <MeowLogo size="md" className="mb-6" />
        
        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">
          Add Your Photo
        </h1>
        <p className="text-muted-foreground text-center mb-8 max-w-sm">
          Upload a clear photo of yourself for verification
        </p>

        {/* Camera View */}
        {showCamera && (
          <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-[60vh] rounded-2xl border-2 border-primary/20"
            />
            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
              <Button onClick={capturePhoto} className="gap-2">
                <Camera className="h-4 w-4" />
                Capture
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Upload Area */}
        <Card className="w-full max-w-sm p-6 bg-card/50 backdrop-blur-sm border-border/50">
          {!photoPreview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center
                transition-all duration-300 cursor-pointer
                ${isDragging 
                  ? "border-primary bg-primary/10 scale-[1.02]" 
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    Drop your photo here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Photo Preview */}
              <div className="relative rounded-2xl overflow-hidden aspect-square animate-in fade-in duration-500">
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
                
                {/* Verification Overlay */}
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

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearPhoto}
                >
                  Change Photo
                </Button>
                {verificationState !== "verified" && (
                  <Button
                    className="flex-1 gap-2"
                    onClick={verifyPhoto}
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

              {/* Verification Result */}
              {verificationResult && verificationState !== "verifying" && (
                <div className={`
                  mt-4 p-3 rounded-xl text-sm
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

          {/* Camera Button */}
          {!photoPreview && (
            <Button
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4" />
              Take a Photo
            </Button>
          )}
        </Card>

        {/* Continue Button */}
        <Button
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
