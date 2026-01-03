import { useState, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load non-critical components
const MeowLogo = lazy(() => import("@/components/MeowLogo"));
const AuroraBackground = lazy(() => import("@/components/AuroraBackground"));

// Inline translations for instant render - no async loading needed
const translations: Record<string, string> = {
  'app.name': 'MEOW MEOW',
  'app.tagline': 'Find your purrfect match',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.login': 'Login',
  'auth.signup': 'Sign Up',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.noAccount': 'No account?',
  'auth.emailRequired': 'Email is required',
  'auth.invalidCredentials': 'Invalid email format',
  'auth.passwordRequired': 'Password is required',
  'auth.passwordTooShort': 'Password must be at least 8 characters',
  'common.loading': 'Loading...',
};

const t = (key: string, fallback?: string) => translations[key] || fallback || key;

// Memoized form inputs for better performance
const EmailInput = memo(({ 
  value, 
  onChange, 
  error, 
  placeholder 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  error?: string; 
  placeholder: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor="email" className="text-sm font-semibold text-primary">
      {placeholder}
    </Label>
    <div className="relative">
      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        id="email"
        type="email"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 pl-10 rounded-xl border-2 transition-all bg-background/50 backdrop-blur-sm",
          error ? "border-destructive" : "border-input focus:border-primary"
        )}
      />
    </div>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));

EmailInput.displayName = 'EmailInput';

const PasswordInput = memo(({ 
  value, 
  onChange, 
  error, 
  placeholder,
  showPassword,
  onToggleShow 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  error?: string; 
  placeholder: string;
  showPassword: boolean;
  onToggleShow: () => void;
}) => (
  <div className="space-y-2">
    <Label htmlFor="password" className="text-sm font-semibold text-primary">
      {placeholder}
    </Label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 pl-10 pr-10 rounded-xl border-2 transition-all bg-background/50 backdrop-blur-sm",
          error ? "border-destructive" : "border-input focus:border-primary"
        )}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));

PasswordInput.displayName = 'PasswordInput';

const AuthScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const handleLogin = useCallback(async () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!validateEmail(email)) {
      newErrors.email = t('auth.invalidCredentials');
    }

    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.passwordTooShort');
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Dynamic imports for auth
      const [{ supabase }, { toast }, { preloadUserContext }] = await Promise.all([
        import("@/integrations/supabase/client"),
        import("@/hooks/use-toast"),
        import("@/hooks/useOptimizedAuth"),
      ]);
      
      // Start auth and preload routes in parallel
      const [authResult] = await Promise.all([
        supabase.auth.signInWithPassword({ email, password }),
        import("./DashboardScreen").catch(() => {}),
        import("./WomenDashboardScreen").catch(() => {}),
      ]);

      const { data: authData, error } = authResult;

      if (error) {
        toast({ title: "Login", description: error.message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        navigate("/welcome-tutorial");
        return;
      }

      // Show success
      toast({ title: "Welcome!", description: "Login successful" });

      // Fetch all user context in parallel
      const context = await preloadUserContext(authData.user.id);

      // Navigate based on context
      if (context.isAdmin) {
        navigate("/admin");
      } else if (!context.tutorialCompleted) {
        navigate("/welcome-tutorial");
      } else if (context.isFemale) {
        // Check approval status for female users
        const approvalStatus = context.femaleProfile?.approval_status || context.profile?.approval_status;
        if (approvalStatus === 'pending') {
          navigate("/approval-pending");
        } else {
          navigate("/women-dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Login", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [email, password, navigate, validateEmail, t]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setErrors(prev => ({ ...prev, email: undefined }));
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setErrors(prev => ({ ...prev, password: undefined }));
  }, []);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      <Suspense fallback={<div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-secondary/30" />}>
        <AuroraBackground />
      </Suspense>
      
      {/* Header */}
      <header className="px-6 pt-8 pb-4 relative z-10">
        <div className="text-center">
          <Suspense fallback={<div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full animate-pulse" />}>
            <MeowLogo size="lg" className="mx-auto mb-4" />
          </Suspense>
          <h1 className="font-display text-4xl font-bold text-primary mb-2 drop-shadow-sm">
            {t('app.name', 'MEOW MEOW')}
          </h1>
          <p className="text-secondary-foreground text-lg">
            {t('app.tagline', 'Find your purrfect match')}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 relative z-10">
        <Card className="w-full max-w-md p-6 bg-card/70 backdrop-blur-xl border border-primary/20 shadow-[0_0_40px_hsl(174_72%_50%/0.1)] animate-slide-up">
          <div className="space-y-6">
            <EmailInput 
              value={email}
              onChange={handleEmailChange}
              error={errors.email}
              placeholder={t('auth.email')}
            />

            <PasswordInput
              value={password}
              onChange={handlePasswordChange}
              error={errors.password}
              placeholder={t('auth.password')}
              showPassword={showPassword}
              onToggleShow={toggleShowPassword}
            />

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {/* Login Button */}
            <Button
              variant="aurora"
              size="xl"
              className="w-full group"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  {t('auth.login')}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('auth.noAccount')}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>

            {/* Register Link */}
            <Button
              variant="aurora"
              size="lg"
              className="w-full"
              onClick={() => navigate("/register")}
            >
              {t('auth.signup')}
            </Button>
          </div>
        </Card>

        {/* App Installation Guide Download */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            const link = document.createElement('a');
            link.href = '/app-installation-guide.txt';
            link.download = 'App-Installation-Guide.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download App Installation Guide (All Devices)</span>
        </button>
      </main>
    </div>
  );
};

export default memo(AuthScreen);
