import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const AuthScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
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

      // Check if user has completed the tutorial
      if (authData.user) {
        const { data: tutorialProgress } = await supabase
          .from("tutorial_progress")
          .select("completed")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        // First-time user or tutorial not completed - show welcome tutorial
        if (!tutorialProgress || !tutorialProgress.completed) {
          navigate("/welcome-tutorial");
          return;
        }

        // Returning user - go to appropriate dashboard based on gender
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
        navigate("/welcome-tutorial");
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
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                    "h-12 pl-10 rounded-xl border-2 transition-all",
                    errors.email ? "border-destructive" : "border-input focus:border-primary"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
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
