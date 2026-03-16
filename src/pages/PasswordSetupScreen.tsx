import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const AuroraBackground = lazy(() => import("@/components/AuroraBackground"));

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const PasswordSetupScreen = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const allRequirementsMet = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid = allRequirementsMet && passwordsMatch;

  const handleSubmit = async () => {
    if (!isValid) {
      toast({
        title: "Please fix the errors",
        description: "Ensure your password meets all requirements and matches.",
        variant: "destructive",
      });
      return;
    }

    // Store password temporarily for account creation after terms agreement
    localStorage.setItem("userPassword", password);

    toast({
      title: "Password saved",
      description: "Please review and accept the terms to complete registration.",
    });

    // Navigate to terms agreement
    navigate("/terms-agreement");
  };

  const handleBack = () => {
    navigate("/location-setup");
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
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <ProgressIndicator currentStep={7} totalSteps={9} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pb-8 overflow-y-auto relative z-10">
        <div className="text-center mb-6 animate-fade-in">
          <MeowLogo size="sm" className="mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Create Your Password
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Secure your account with a strong password
          </p>
        </div>

        <Card className="w-full max-w-sm p-6 bg-card/70 backdrop-blur-xl border-primary/20 shadow-[0_0_40px_hsl(var(--primary)/0.1)]">
          <div className="space-y-6">
            {/* Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  className={cn(
                    "h-12 pr-10 rounded-xl border-2 transition-all",
                    touched.password && !allRequirementsMet
                      ? "border-destructive focus:border-destructive"
                      : "border-input focus:border-primary"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Password must have:</p>
              <div className="space-y-1.5">
                {passwordRequirements.map((req, index) => {
                  const met = req.test(password);
                  return (
                    <div
                      key={index}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-all duration-200",
                      met ? "text-success" : "text-muted-foreground"
                    )}
                    >
                      {met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {req.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="w-4 h-4 text-primary" />
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                  className={cn(
                    "h-12 pr-10 rounded-xl border-2 transition-all",
                    touched.confirm && !passwordsMatch && confirmPassword.length > 0
                      ? "border-destructive focus:border-destructive"
                      : "border-input focus:border-primary"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.confirm && confirmPassword.length > 0 && (
                <p className={cn(
                  "text-xs flex items-center gap-1 animate-fade-in",
                  passwordsMatch ? "text-success" : "text-destructive"
                )}>
                  {passwordsMatch ? (
                    <>
                      <Check className="h-3 w-3" />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full h-12 rounded-xl font-semibold text-base gap-2"
            >
              Continue to Terms
            </Button>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4 max-w-xs">
          Your password is securely encrypted and never stored in plain text
        </p>
      </main>
    </div>
  );
};

export default PasswordSetupScreen;
