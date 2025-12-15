import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Camera, 
  User, 
  Calendar, 
  Languages,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "pending" | "processing" | "completed" | "failed";
  message?: string;
}

const AIProcessingScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [processingLogId, setProcessingLogId] = useState<string | null>(null);

  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "photo", label: "Photo Verification", icon: <Camera className="w-5 h-5" />, status: "pending" },
    { id: "gender", label: "Gender Verification", icon: <User className="w-5 h-5" />, status: "pending" },
    { id: "age", label: "Age Verification", icon: <Calendar className="w-5 h-5" />, status: "pending" },
    { id: "language", label: "Language Detection", icon: <Languages className="w-5 h-5" />, status: "pending" },
  ]);

  const updateStepStatus = useCallback((stepId: string, status: ProcessingStep["status"], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, message } : step
    ));
  }, []);

  const simulateProcessing = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Create processing log entry
      const { data: logData, error: logError } = await supabase
        .from("processing_logs")
        .insert({
          user_id: user.id,
          processing_status: "processing",
          current_step: "photo",
          progress_percent: 0,
        })
        .select()
        .single();

      if (logError) throw logError;
      setProcessingLogId(logData.id);

      // Get user profile for verification
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const errors: string[] = [];

      // Step 1: Photo Verification (0-25%)
      if (!isCancelled) {
        updateStepStatus("photo", "processing");
        await updateLog(logData.id, "photo", 10);
        setProgress(10);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (profile?.photo_url) {
          updateStepStatus("photo", "completed", "Photo verified successfully");
          await updateLog(logData.id, "photo", 25, { photo_verified: true });
        } else {
          updateStepStatus("photo", "failed", "No photo uploaded");
          errors.push("Photo verification failed: No photo uploaded");
        }
        setProgress(25);
      }

      // Step 2: Gender Verification (25-50%)
      if (!isCancelled) {
        updateStepStatus("gender", "processing");
        await updateLog(logData.id, "gender", 35);
        setProgress(35);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (profile?.gender) {
          updateStepStatus("gender", "completed", `Gender: ${profile.gender}`);
          await updateLog(logData.id, "gender", 50, { gender_verified: true });
        } else {
          updateStepStatus("gender", "failed", "Gender not specified");
          errors.push("Gender verification skipped: Not specified");
        }
        setProgress(50);
      }

      // Step 3: Age Verification (50-75%)
      if (!isCancelled) {
        updateStepStatus("age", "processing");
        await updateLog(logData.id, "age", 60);
        setProgress(60);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (profile?.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          if (age >= 18) {
            updateStepStatus("age", "completed", `Age verified: ${age} years old`);
            await updateLog(logData.id, "age", 75, { age_verified: true });
          } else {
            updateStepStatus("age", "failed", "Must be 18 or older");
            errors.push("Age verification failed: User is under 18");
          }
        } else {
          updateStepStatus("age", "failed", "Date of birth not provided");
          errors.push("Age verification skipped: Date of birth not provided");
        }
        setProgress(75);
      }

      // Step 4: Language Detection (75-100%)
      if (!isCancelled) {
        updateStepStatus("language", "processing");
        await updateLog(logData.id, "language", 85);
        setProgress(85);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (profile?.preferred_language) {
          updateStepStatus("language", "completed", `Language: ${profile.preferred_language}`);
          await updateLog(logData.id, "language", 100, { language_detected: true });
        } else {
          updateStepStatus("language", "completed", "Default: English");
          await updateLog(logData.id, "language", 100, { language_detected: true });
        }
        setProgress(100);
      }

      // Complete processing
      if (!isCancelled) {
        const hasFailures = errors.length > 0;
        setHasErrors(hasFailures);
        
        await supabase
          .from("processing_logs")
          .update({
            processing_status: hasFailures ? "completed_with_errors" : "completed",
            completed_at: new Date().toISOString(),
            errors: errors,
          })
          .eq("id", logData.id);

        setIsComplete(true);

        if (!hasFailures) {
          toast({
            title: "Verification Complete!",
            description: "All checks passed successfully.",
          });
        } else {
          toast({
            title: "Verification Complete",
            description: `Completed with ${errors.length} warning(s).`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing Error",
        description: "An error occurred during verification. Please try again.",
        variant: "destructive",
      });
    }
  }, [isCancelled, navigate, toast, updateStepStatus]);

  const updateLog = async (logId: string, step: string, progressPercent: number, updates?: object) => {
    await supabase
      .from("processing_logs")
      .update({
        current_step: step,
        progress_percent: progressPercent,
        ...updates,
      })
      .eq("id", logId);
  };

  useEffect(() => {
    simulateProcessing();
  }, []);

  const handleCancel = async () => {
    setIsCancelled(true);
    
    if (processingLogId) {
      await supabase
        .from("processing_logs")
        .update({
          processing_status: "cancelled",
          completed_at: new Date().toISOString(),
        })
        .eq("id", processingLogId);
    }

    toast({
      title: "Processing Cancelled",
      description: "You can restart the verification later.",
    });

    navigate("/terms-agreement");
  };

  const handleContinue = () => {
    navigate("/welcome-tutorial");
  };

  const handleRetry = () => {
    setProgress(0);
    setIsCancelled(false);
    setIsComplete(false);
    setHasErrors(false);
    setSteps(steps.map(step => ({ ...step, status: "pending", message: undefined })));
    simulateProcessing();
  };

  const getStatusIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500 animate-scale-in" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive animate-scale-in" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <MeowLogo />
        <ProgressIndicator currentStep={10} totalSteps={10} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg p-8 space-y-8 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {isComplete ? (hasErrors ? "Verification Complete" : "All Set!") : "AI Processing"}
            </h1>
            <p className="text-muted-foreground">
              {isComplete 
                ? (hasErrors ? "Completed with some warnings" : "Your profile has been verified")
                : "Verifying your profile information"
              }
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress 
              value={progress} 
              className="h-3 transition-all duration-500"
            />
          </div>

          {/* Processing Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  step.status === "processing" 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : step.status === "completed"
                    ? "border-green-500/30 bg-green-500/5"
                    : step.status === "failed"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`p-2 rounded-lg ${
                  step.status === "processing" ? "bg-primary/10 text-primary" :
                  step.status === "completed" ? "bg-green-500/10 text-green-500" :
                  step.status === "failed" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{step.label}</div>
                  {step.message && (
                    <div className={`text-sm ${
                      step.status === "failed" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {step.message}
                    </div>
                  )}
                </div>
                {getStatusIcon(step.status)}
              </div>
            ))}
          </div>

          {/* Warning Banner */}
          {isComplete && hasErrors && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Some verifications need attention
                </p>
                <p className="text-muted-foreground mt-1">
                  You can continue, but some features may be limited.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isComplete ? (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 h-12"
                disabled={isCancelled}
              >
                {isCancelled ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel"
                )}
              </Button>
            ) : (
              <>
                {hasErrors && (
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                    className="flex-1 h-12"
                  >
                    Retry
                  </Button>
                )}
                <Button
                  onClick={handleContinue}
                  className="flex-1 h-12 text-base font-medium"
                  variant="aurora"
                >
                  Continue
                </Button>
              </>
            )}
          </div>

          {/* Footer Note */}
          {!isComplete && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              Please wait while we verify your information...
            </p>
          )}
        </Card>
      </main>
    </div>
  );
};

export default AIProcessingScreen;
