import { useState, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Upload, X, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProgressIndicator from "@/components/ProgressIndicator";
import ScreenTitle from "@/components/ScreenTitle";
import { toast } from "@/hooks/use-toast";

const AuroraBackground = lazy(() => import("@/components/AuroraBackground"));

const AIVerificationScreen = () => {
  const navigate = useNavigate();
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take a selfie",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
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
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setSelfieImage(imageData);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelfieImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 5 - additionalPhotos.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAdditionalPhotos(prev => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (!selfieImage) {
      toast({
        title: "Selfie required",
        description: "Please take a selfie for AI verification",
        variant: "destructive",
      });
      return;
    }

    // Store in session for later use
    sessionStorage.setItem("verificationSelfie", selfieImage);
    sessionStorage.setItem("additionalPhotos", JSON.stringify(additionalPhotos));

    toast({
      title: "Verification photo captured!",
      description: "AI will verify your identity after registration",
    });

    navigate("/basic-info");
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-background text-foreground">
      <Suspense fallback={
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-secondary/30" />
      }>
        <AuroraBackground />
      </Suspense>

      {/* Header */}
      <header className="px-6 pt-8 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/register")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <ProgressIndicator currentStep={2} totalSteps={10} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pb-8 relative z-10 overflow-y-auto">
        <ScreenTitle
          title="AI Verification"
          subtitle="Take a selfie for identity verification"
          logoSize="sm"
          className="mb-6"
        />

        {/* Verification Info */}
        <div className="w-full max-w-md mb-6">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Why we verify</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  AI verification ensures real people on our platform, creating a safer dating experience for everyone.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Selfie Capture Section */}
        <Card className="w-full max-w-md p-6 space-y-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Selfie for Verification</h2>
            <span className="text-xs text-destructive">*Required</span>
          </div>

          {isCapturing ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-primary/50 rounded-xl pointer-events-none" />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={stopCamera}
                >
                  Cancel
                </Button>
                <Button
                  variant="aurora"
                  className="flex-1"
                  onClick={capturePhoto}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          ) : selfieImage ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                <img
                  src={selfieImage}
                  alt="Verification selfie"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setSelfieImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-500/90 rounded-full">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-xs font-medium text-white">Ready for AI</span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelfieImage(null)}
              >
                Retake Photo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 aspect-[4/3] cursor-pointer hover:border-primary/50 transition-colors"
                onClick={startCamera}
              >
                <Camera className="w-12 h-12 text-primary/50 mb-3" />
                <p className="text-sm font-medium text-foreground">Take a Selfie</p>
                <p className="text-xs text-muted-foreground mt-1">Click to open camera</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleSelfieUpload}
              />
            </div>
          )}
        </Card>

        {/* Additional Photos Section (Optional) */}
        <Card className="w-full max-w-md p-6 mt-4 space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Additional Photos</h2>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            <span className="text-sm text-muted-foreground">{additionalPhotos.length}/5</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {additionalPhotos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removeAdditionalPhoto(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {additionalPhotos.length < 5 && (
              <div
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => additionalInputRef.current?.click()}
              >
                <span className="text-2xl text-muted-foreground">+</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Add up to 5 more photos to your profile
          </p>
          <input
            ref={additionalInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAdditionalPhotos}
          />
        </Card>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Spacer */}
        <div className="flex-1 min-h-4" />

        {/* Continue Button */}
        <div className="w-full max-w-md mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Button
            variant="aurora"
            size="xl"
            className="w-full group"
            onClick={handleNext}
            disabled={!selfieImage}
          >
            Continue
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Your photos are encrypted and securely stored
          </p>
        </div>
      </main>
    </div>
  );
};

export default AIVerificationScreen;
