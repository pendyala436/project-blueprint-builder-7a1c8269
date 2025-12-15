import { useState, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Download, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
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
    <Label htmlFor="email" className="text-sm font-semibold">
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
    <Label htmlFor="password" className="text-sm font-semibold">
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
  const { 
    isInstallable, 
    isInstalled, 
    install, 
    isIOS, 
    isAndroid, 
    isWindows, 
    isMacOS, 
    isLinux,
    isChrome,
    isEdge,
    isSafari,
    isFirefox
  } = usePWA();
  const browserName = isChrome ? 'Chrome' : isEdge ? 'Edge' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'your browser';
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  // Get OS-specific install instructions
  const getOSInstructions = () => {
    if (isIOS) {
      return {
        title: "Install on iOS",
        icon: "🍎",
        steps: [
          "Tap the Share button (square with arrow) in Safari",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm installation"
        ]
      };
    }
    if (isAndroid) {
      return {
        title: "Install on Android",
        icon: "🤖",
        steps: [
          "Tap the menu (⋮) in Chrome or your browser",
          "Tap 'Install app' or 'Add to Home screen'",
          "Confirm by tapping 'Install'"
        ]
      };
    }
    if (isWindows) {
      return {
        title: "Install on Windows",
        icon: "🪟",
        steps: [
          `In ${browserName || 'Chrome/Edge'}, click the install icon (⊕) in the address bar`,
          "Or click menu (⋯) → 'Install Meow Meow'",
          "Click 'Install' to add to your Start menu"
        ]
      };
    }
    if (isMacOS) {
      return {
        title: "Install on macOS",
        icon: "🍏",
        steps: [
          `In ${browserName || 'Chrome/Safari'}, click the install icon in the address bar`,
          "Or use File menu → 'Install Meow Meow...'",
          "The app will appear in your Applications folder"
        ]
      };
    }
    if (isLinux) {
      return {
        title: "Install on Linux",
        icon: "🐧",
        steps: [
          `In ${browserName || 'Chrome/Firefox'}, click the install icon in the address bar`,
          "Or click menu → 'Install app'",
          "The app will be added to your applications"
        ]
      };
    }
    return {
      title: "Install App",
      icon: "📱",
      steps: [
        "Open this site in Chrome, Edge, or Safari",
        "Look for the install icon in the address bar",
        "Click 'Install' to add to your device"
      ]
    };
  };

  const handleInstallClick = async () => {
    console.log('Install button clicked', { isInstallable, isInstalled, isIOS, isAndroid, isWindows, isMacOS, isLinux });
    
    if (isInstallable) {
      // Browser supports native install prompt
      try {
        const installed = await install();
        console.log('Install result:', installed);
        if (!installed) {
          setShowInstallInstructions(true);
        }
      } catch (err) {
        console.error('Install error:', err);
        setShowInstallInstructions(true);
      }
    } else {
      // Show manual instructions for this platform
      console.log('Showing manual instructions');
      setShowInstallInstructions(true);
    }
  };

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
          <h1 className="font-display text-4xl font-bold text-foreground mb-2 drop-shadow-sm">
            {t('app.name', 'MEOW MEOW')}
          </h1>
          <p className="text-muted-foreground text-lg">
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

            {/* PWA Install Button - Always visible */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Install App
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>

            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 text-sm text-primary py-3">
                <Smartphone className="w-4 h-4" />
                <span>App installed</span>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-primary/30 hover:bg-primary/10 group"
                  onClick={handleInstallClick}
                >
                  <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  <Smartphone className="w-4 h-4 mr-2" />
                  Install App
                </Button>

                {/* Installation Instructions */}
                {showInstallInstructions && (
                  <Card className="p-4 bg-primary/5 border-primary/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getOSInstructions().icon}</span>
                      <p className="text-sm font-medium text-foreground">
                        {getOSInstructions().title}
                      </p>
                    </div>
                    <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      {getOSInstructions().steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setShowInstallInstructions(false)}
                    >
                      Got it
                    </Button>
                  </Card>
                )}
              </>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default memo(AuthScreen);
