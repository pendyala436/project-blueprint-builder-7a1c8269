import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import AuroraBackground from "@/components/AuroraBackground";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, ArrowRight, Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email";
    return undefined;
  };

  const handleSendResetLink = async () => {
    const emailError = validateEmail(email);
    setError(emailError);

    if (emailError) {
      return;
    }

    setIsLoading(true);

    try {
      // First check if email exists in database
      const { data: checkData, error: checkError } = await supabase.functions.invoke(
        "reset-password",
        {
          body: {
            action: "check-email-exists",
            email: email.trim().toLowerCase(),
          },
        }
      );

      if (checkError) {
        throw checkError;
      }

      if (!checkData?.exists) {
        toast({
          title: "Email not found",
          description: "No account found with this email address. Please check and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Email exists, request password reset via our custom endpoint
      const { data: resetData, error: resetError } = await supabase.functions.invoke(
        "reset-password",
        {
          body: {
            action: "request-reset",
            email: email.trim().toLowerCase(),
            redirectUrl: window.location.origin,
          },
        }
      );

      if (resetError) {
        throw resetError;
      }

      setEmailSent(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for the password reset link. It expires in 30 minutes.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reset link",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <AuroraBackground />
      
      {/* Header */}
      <header className="px-6 pt-8 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center pr-10">
            <MeowLogo size="sm" className="mx-auto" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative z-10">
        <Card className="w-full max-w-md p-6 bg-card/70 backdrop-blur-xl border border-primary/20 shadow-[0_0_40px_hsl(174_72%_50%/0.1)] animate-slide-up">
          <div className="space-y-6">
            {/* Title */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                {emailSent ? (
                  <CheckCircle className="w-8 h-8 text-accent" />
                ) : (
                  <ShieldCheck className="w-8 h-8 text-primary" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground font-display">
                {emailSent ? "Check Your Email" : "Reset Password"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {emailSent
                  ? "We've sent a password reset link to your email address"
                  : "Enter your email address and we'll send you a link to reset your password"}
              </p>
            </div>

            {!emailSent ? (
              <>
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(undefined);
                    }}
                    className={cn(
                      "h-12 rounded-xl border-2 transition-all bg-background/50 backdrop-blur-sm",
                      error ? "border-destructive" : "border-input focus:border-primary"
                    )}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>

                {/* Send Reset Link Button */}
                <Button
                  variant="aurora"
                  size="xl"
                  className="w-full group"
                  onClick={handleSendResetLink}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Success Message */}
                <div className="p-4 bg-accent/10 rounded-xl border border-accent/20 text-center space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    Reset link sent to:
                  </p>
                  <p className="text-sm text-primary font-semibold">
                    {email}
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                    ⏰ The link expires in 30 minutes
                  </p>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    try again
                  </button>
                </p>
              </>
            )}

            {/* Back to Login */}
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <button
                onClick={() => navigate("/")}
                className="text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Back to Login
              </button>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ForgotPasswordScreen;
