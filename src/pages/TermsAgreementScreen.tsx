import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { ScrollText, Shield, Check, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TermsAgreementScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      if (isAtBottom) {
        setHasScrolledToBottom(true);
        setShowScrollHint(false);
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleSubmit = async () => {
    if (!agreedTerms) {
      toast({
        title: "Agreement required",
        description: "Please agree to the Terms of Service to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

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

      const { error } = await supabase
        .from("user_consent")
        .upsert({
          user_id: user.id,
          agreed_terms: agreedTerms,
          gdpr_consent: gdprConsent,
          ccpa_consent: gdprConsent,
          dpdp_consent: gdprConsent,
          terms_version: "1.0",
          consent_timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your account setup is complete.",
      });

      navigate("/password-setup");
    } catch (error) {
      console.error("Error saving consent:", error);
      toast({
        title: "Error",
        description: "Failed to save your consent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <MeowLogo />
        <ProgressIndicator currentStep={6} totalSteps={7} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg p-8 space-y-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <ScrollText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Terms & Agreement</h1>
            <p className="text-muted-foreground">
              Please read and accept our terms to continue
            </p>
          </div>

          {/* Scrollable Terms Area */}
          <div className="relative">
            <div
              ref={scrollRef}
              className="h-64 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground scroll-smooth"
            >
              <h3 className="font-semibold text-foreground mb-3">Terms of Service</h3>
              <p className="mb-4">
                Welcome to our platform. By using our services, you agree to be bound by
                these Terms of Service. Please read them carefully before proceeding.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">1. Acceptance of Terms</h4>
              <p className="mb-3">
                By accessing or using our service, you acknowledge that you have read,
                understood, and agree to be bound by these Terms. If you do not agree to
                these Terms, please do not use our service.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">2. Privacy Policy</h4>
              <p className="mb-3">
                Your privacy is important to us. Our Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our service.
                Please review our Privacy Policy carefully.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">3. User Accounts</h4>
              <p className="mb-3">
                When you create an account with us, you must provide accurate, complete,
                and current information. You are responsible for safeguarding your account
                credentials and for any activities or actions under your account.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">4. GDPR Compliance</h4>
              <p className="mb-3">
                For users in the European Union, we comply with the General Data Protection
                Regulation (GDPR). You have the right to access, rectify, or erase your
                personal data. You may also restrict or object to certain processing activities.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">5. CCPA Compliance</h4>
              <p className="mb-3">
                For California residents, we comply with the California Consumer Privacy Act
                (CCPA). You have the right to know what personal information we collect and
                how it is used, shared, or sold.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">6. DPDP Compliance</h4>
              <p className="mb-3">
                For users in India, we comply with the Digital Personal Data Protection Act
                (DPDP). We ensure that your personal data is processed lawfully, fairly,
                and in a transparent manner.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">7. Data Retention</h4>
              <p className="mb-3">
                We will retain your personal data only for as long as is necessary for the
                purposes set out in this policy. We will retain and use your data to the
                extent necessary to comply with our legal obligations.
              </p>

              <h4 className="font-medium text-foreground mt-4 mb-2">8. Changes to Terms</h4>
              <p className="mb-3">
                We reserve the right to modify or replace these Terms at any time. We will
                provide notice of any changes by posting the new Terms on this page with an
                updated revision date.
              </p>

              <div className="h-4" /> {/* Bottom padding for scroll detection */}
            </div>

            {/* Scroll Hint */}
            {showScrollHint && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 bg-primary/90 text-primary-foreground rounded-full text-xs font-medium animate-bounce shadow-lg"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Scroll to read more
              </button>
            )}
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                agreedTerms
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Checkbox
                checked={agreedTerms}
                onCheckedChange={(checked) => setAgreedTerms(checked === true)}
                className="mt-0.5 data-[state=checked]:animate-scale-in"
              />
              <div className="flex-1">
                <span className="font-medium text-foreground">
                  I agree to the Terms of Service *
                </span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Required to continue using our platform
                </p>
              </div>
              {agreedTerms && (
                <Check className="w-5 h-5 text-primary animate-scale-in" />
              )}
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                gdprConsent
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Checkbox
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked === true)}
                className="mt-0.5 data-[state=checked]:animate-scale-in"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    Data Privacy Consent
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  I consent to the processing of my data as described in the Privacy Policy
                  (GDPR, CCPA, DPDP compliant)
                </p>
              </div>
              {gdprConsent && (
                <Check className="w-5 h-5 text-primary animate-scale-in" />
              )}
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/language-preferences")}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !agreedTerms}
              className="flex-1 h-12 text-base font-medium"
              variant="gradient"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Accept & Continue"
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-muted-foreground">
            Your consent will be recorded with a timestamp for compliance purposes.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default TermsAgreementScreen;
