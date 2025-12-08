import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import ProgressIndicator from "@/components/ProgressIndicator";
import MeowLogo from "@/components/MeowLogo";
import { Eye, EyeOff, Lock, Check, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const PasswordSetupScreen = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [strength, setStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
  ];

  const requirements = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "One number", test: (p: string) => /[0-9]/.test(p) },
    { label: "One special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ];

  useEffect(() => {
    if (!password) {
      setStrength(0);
      return;
    }

    let score = 0;
    requirements.forEach((req) => {
      if (req.test(password)) score++;
    });
    setStrength(score);
  }, [password]);

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  }, [password, confirmPassword]);

  const validatePassword = (): boolean => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }

    if (strength < 3) {
      setPasswordError("Please create a stronger password");
      return false;
    }

    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (): boolean => {
    if (!confirmPassword) {
      setConfirmError("Please confirm your password");
      return false;
    }

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return false;
    }

    setConfirmError("");
    return true;
  };

  const handleSubmit = async () => {
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();

    if (!isPasswordValid || !isConfirmValid) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call for password setup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Password set successfully! 🎉");
    setIsSubmitting(false);
    
    // Navigate to photo upload screen
    navigate("/photo-upload");
  };

  const getStrengthPercentage = () => {
    return (strength / 5) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <MeowLogo size="sm" />
        <ProgressIndicator currentStep={3} totalSteps={9} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-12 animate-fade-in">
        <div className="max-w-md mx-auto w-full space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Secure Your Account
            </h1>
            <p className="text-muted-foreground">
              Create a strong password to protect your profile
            </p>
          </div>

          {/* Password Form */}
          <div className="space-y-6">
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  className={`h-14 text-lg pr-12 transition-all duration-200 ${
                    passwordError ? "border-destructive animate-shake" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive animate-fade-in">{passwordError}</p>
              )}
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Password Strength</span>
                  <span
                    className={`text-sm font-medium ${
                      strength <= 1
                        ? "text-red-500"
                        : strength === 2
                        ? "text-yellow-500"
                        : strength === 3
                        ? "text-lime-500"
                        : "text-green-500"
                    }`}
                  >
                    {strengthLabels[strength - 1] || "Too Weak"}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${
                      strengthColors[strength - 1] || "bg-muted"
                    }`}
                    style={{ width: `${getStrengthPercentage()}%` }}
                  />
                </div>

                {/* Requirements Checklist */}
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {requirements.map((req, index) => {
                    const passed = req.test(password);
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                          passed ? "text-green-500" : "text-muted-foreground"
                        }`}
                      >
                        {passed ? (
                          <Check className="w-4 h-4 animate-scale-in" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError("");
                  }}
                  className={`h-14 text-lg pr-12 transition-all duration-200 ${
                    confirmError ? "border-destructive animate-shake" : ""
                  } ${
                    confirmPassword && !confirmError && password === confirmPassword
                      ? "border-green-500"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
                {confirmPassword && !confirmError && password === confirmPassword && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500 animate-scale-in" />
                  </div>
                )}
              </div>
              {confirmError && (
                <p className="text-sm text-destructive animate-fade-in">{confirmError}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            variant="aurora"
            size="xl"
            onClick={handleSubmit}
            disabled={isSubmitting || !password || !confirmPassword}
            className="w-full animate-bounce-subtle"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Setting up...</span>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                Continue
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>

          {/* Security Note */}
          <p className="text-center text-sm text-muted-foreground">
            🔒 Your password is encrypted and secure
          </p>
        </div>
      </main>
    </div>
  );
};

export default PasswordSetupScreen;
