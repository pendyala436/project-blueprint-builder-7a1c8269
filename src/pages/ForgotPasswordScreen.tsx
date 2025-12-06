import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Mail, Phone, Lock, ArrowLeft, ArrowRight, Loader2, Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "verify" | "reset";

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("verify");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    phone?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email";
    return undefined;
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) return "Phone number is required";
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(value)) return "Please enter a valid phone number";
    return undefined;
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Must contain an uppercase letter";
    if (!/[a-z]/.test(value)) return "Must contain a lowercase letter";
    if (!/[0-9]/.test(value)) return "Must contain a number";
    return undefined;
  };

  const handleVerify = async () => {
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);

    setErrors({ email: emailError, phone: phoneError });

    if (emailError || phoneError) {
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to verify email + phone combination
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: {
          action: "verify",
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        },
      });

      if (error) throw error;

      if (data?.verified) {
        setIsVerified(true);
        setStep("reset");
        toast({
          title: "Identity verified!",
          description: "You can now set a new password.",
        });
      } else {
        toast({
          title: "Verification failed",
          description: data?.message || "Email and phone number combination not found.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordError = validatePassword(newPassword);
    let confirmError: string | undefined;

    if (!confirmPassword) {
      confirmError = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      confirmError = "Passwords do not match";
    }

    setErrors({ newPassword: passwordError, confirmPassword: confirmError });

    if (passwordError || confirmError) {
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to reset password
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: {
          action: "reset",
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          newPassword,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Password reset successful!",
          description: "You can now login with your new password.",
        });
        navigate("/");
      } else {
        toast({
          title: "Reset failed",
          description: data?.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4">
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
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <Card className="w-full max-w-md p-6 bg-card/80 backdrop-blur-sm border border-border/30 shadow-card animate-slide-up">
          <div className="space-y-6">
            {/* Title */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {step === "verify" ? "Reset Password" : "Set New Password"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {step === "verify"
                  ? "Enter your email and phone number to verify your identity"
                  : "Create a strong password for your account"}
              </p>
            </div>

            {step === "verify" ? (
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
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={cn(
                      "h-12 rounded-xl border-2 transition-all",
                      errors.email ? "border-destructive" : "border-input focus:border-primary"
                    )}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                {/* Phone Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    className={cn(
                      "h-12 rounded-xl border-2 transition-all",
                      errors.phone ? "border-destructive" : "border-input focus:border-primary"
                    )}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>

                {/* Verify Button */}
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full group"
                  onClick={handleVerify}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Identity
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Verified Badge */}
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Identity Verified
                  </span>
                </div>

                {/* New Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, newPassword: undefined }));
                      }}
                      className={cn(
                        "h-12 pr-10 rounded-xl border-2 transition-all",
                        errors.newPassword ? "border-destructive" : "border-input focus:border-primary"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-xs text-destructive">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                      }}
                      className={cn(
                        "h-12 pr-10 rounded-xl border-2 transition-all",
                        errors.confirmPassword ? "border-destructive" : "border-input focus:border-primary",
                        confirmPassword && !errors.confirmPassword && newPassword === confirmPassword
                          ? "border-green-500"
                          : ""
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Reset Button */}
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full group"
                  onClick={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
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

      {/* Decorative Elements */}
      <div className="fixed top-20 left-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="fixed bottom-32 right-4 w-32 h-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
    </div>
  );
};

export default ForgotPasswordScreen;
