import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Mail, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import PhoneInputWithCode from "@/components/PhoneInputWithCode";

type LoginMethod = "email" | "phone";

const AuthScreen = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [identifier, setIdentifier] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    // Format: +{countryCode 1-5 digits}{phone 10 digits}
    // e.g., +919876543210 or +12025551234
    const match = phone.match(/^\+\d{1,5}\d{10}$/);
    return match !== null;
  };

  const handleLogin = async () => {
    const newErrors: { identifier?: string; password?: string } = {};

    if (loginMethod === "email") {
      if (!identifier.trim()) {
        newErrors.identifier = "Email is required";
      } else if (!validateEmail(identifier)) {
        newErrors.identifier = "Please enter a valid email";
      }
    } else {
      if (!phoneValue.trim()) {
        newErrors.identifier = "Phone number is required";
      } else if (!validatePhone(phoneValue)) {
        newErrors.identifier = "Please enter a valid phone number";
      }
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      let loginEmail = identifier;

      if (loginMethod === "phone") {
        // Look up user's email from profiles table using phone number
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", phoneValue)
          .maybeSingle();

        if (profileError || !profile) {
          toast({
            title: "Account not found",
            description: "No account found with this phone number. Please check and try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Get the user's email from auth using the user_id
        const { data: authUser } = await supabase.auth.admin?.getUserById?.(profile.user_id) || {};
        
        // Since we can't access admin API from client, we need to get email from a different approach
        // We'll use the profiles table or ask user to also provide email
        // For now, let's look for email in a join or stored field
        
        // Alternative: Store email in profiles table during registration
        const { data: userProfile, error: userError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", phoneValue)
          .maybeSingle();

        if (!userProfile) {
          toast({
            title: "Account not found",
            description: "No account found with this phone number.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // We need to get the email associated with this user
        // Since we can't directly query auth.users, we'll use the edge function
        const { data: resetData, error: resetError } = await supabase.functions.invoke('reset-password', {
          body: { 
            action: 'get-email-by-phone',
            phone: phoneValue 
          }
        });

        if (resetError || !resetData?.email) {
          toast({
            title: "Login failed",
            description: "Could not retrieve account information. Please try email login.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        loginEmail = resetData.email;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Login successful.",
      });

      // Check user gender to redirect to appropriate dashboard
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("gender")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (profile?.gender === "female") {
          navigate("/women-dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred",
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
        <div className="text-center">
          <MeowLogo size="lg" className="mx-auto mb-4" />
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            MEOW MEOW
          </h1>
          <p className="text-muted-foreground text-lg">
            Find your purrfect match
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <Card className="w-full max-w-md p-6 bg-card/80 backdrop-blur-sm border border-border/30 shadow-card animate-slide-up">
          <div className="space-y-6">
            {/* Login Method Toggle */}
            <div className="flex rounded-xl bg-muted/50 p-1">
              <button
                onClick={() => {
                  setLoginMethod("email");
                  setIdentifier("");
                  setPhoneValue("");
                  setErrors({});
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  loginMethod === "email"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => {
                  setLoginMethod("phone");
                  setIdentifier("");
                  setPhoneValue("");
                  setErrors({});
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  loginMethod === "phone"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
            </div>

            {/* Identifier Input */}
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-semibold">
                {loginMethod === "email" ? "Email Address" : "Phone Number"}
              </Label>
              {loginMethod === "email" ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="email"
                    placeholder="Enter your email"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setErrors((prev) => ({ ...prev, identifier: undefined }));
                    }}
                    className={cn(
                      "h-12 pl-10 rounded-xl border-2 transition-all",
                      errors.identifier ? "border-destructive" : "border-input focus:border-primary"
                    )}
                  />
                </div>
              ) : (
                <PhoneInputWithCode
                  value={phoneValue}
                  onChange={(value) => {
                    setPhoneValue(value);
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  error={!!errors.identifier}
                />
              )}
              {errors.identifier && (
                <p className="text-xs text-destructive">{errors.identifier}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={cn(
                    "h-12 pl-10 pr-10 rounded-xl border-2 transition-all",
                    errors.password ? "border-destructive" : "border-input focus:border-primary"
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
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <Button
              variant="hero"
              size="xl"
              className="w-full group"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Logging in...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                New here?
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Register Link */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/register")}
            >
              Create an Account
            </Button>
          </div>
        </Card>
      </main>

      {/* Decorative Elements */}
      <div className="fixed top-20 left-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="fixed bottom-32 right-4 w-32 h-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
    </div>
  );
};

export default AuthScreen;
