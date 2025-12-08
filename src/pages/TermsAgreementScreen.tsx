import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { useToast } from "@/hooks/use-toast";
import { 
  ScrollText, 
  Shield, 
  Check, 
  Loader2, 
  FileText,
  Lock,
  Globe,
  Database,
  Users,
  Ban,
  CreditCard,
  Eye,
  UserCheck,
  Bot,
  Clock,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LegalDocument {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  required: boolean;
}

const legalDocuments: LegalDocument[] = [
  {
    id: "terms_of_service",
    title: "Terms of Service",
    icon: <ScrollText className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – GLOBAL CHAT-ONLY DATING APP
Terms of Service (TOS)

1. Acceptance of Terms
By creating an account or using Meow Meow, you agree to these Terms of Service. If you disagree, do not use the app.

2. Eligibility
• You must be 18 or older.
• Only Male and Female gender options are allowed.
• One account per user.
• You must provide accurate information.

3. Nature of Service
• Chat-only global dating platform
• No video calls
• No audio calls
• No media sharing (temporary only, auto-deleted)
• Auto-translation using NLLB-200
• Only online users are visible
• Matching based on gender + language rules

4. Prohibited Conduct
Users must NOT:
• Send sexual content
• Harass, threaten, or abuse
• Ask for or send contact details
• Engage in illegal activity
• Impersonate others
• Create multiple accounts
• Attempt to involve minors
• Engage in prostitution or escort services
• Scam or manipulate users
• Attempt chargebacks
• Use VPN to fake region
• Circumvent gender restrictions

5. Payments (Men Only)
• Wallet recharge is non-refundable
• Coins do not expire
• Fraud → permanent suspension

6. Earnings & Payouts (Women Only)
• Women can earn from chat activity
• ID verification may be required
• Payout thresholds apply
• Fraud or fake activity forfeits earnings

7. Data Storage Consent
You agree that your data may be stored and processed in India or other Asia-based data centers for performance, security, and compliance.

8. Account Termination
We may suspend or terminate accounts without notice for any policy violation.

9. Disclaimer
The service is provided "AS IS". We are not liable for user behavior, technical issues, or translation inaccuracies.

10. Governing Law
Subject to the jurisdiction of the company's registration.`
  },
  {
    id: "privacy_policy",
    title: "Privacy Policy",
    icon: <Shield className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – PRIVACY POLICY

1. Information We Collect
• Name, gender, age, DOB
• Languages & mother tongue
• Country & region
• Online/offline status
• Device information
• Payment history
• Earnings history (women)
• Chat messages are auto-deleted after 15 minutes.

2. Sensitive Data
We do not collect:
• Contacts
• Social accounts
• Personal media files (permanent)

3. How We Use Data
• Matching
• Auto-translation
• Safety
• Fraud detection
• Legal compliance

4. Data Storage & Transfer
Your data may be stored in:
• India
• Singapore
• Japan
• UAE
• Any Asia-based secure data center

All storage is compliant with GDPR, CCPA, DPDP India, and global privacy frameworks.

5. Your Rights
• Delete account
• Request data export
• Correct personal data
• Withdraw consent

6. Data Sharing
We may share limited data with:
• Payment processors
• Payout providers
• Law enforcement (only when legally required)

7. Data Retention
• Chat: 15 minutes
• Payments: 7 years
• Logs: 30–90 days
• Account data: Until the user deletes account`
  },
  {
    id: "security_policy",
    title: "Security Policy",
    icon: <Lock className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – SECURITY POLICY

1. Encryption
• Data in transit: TLS 1.3
• Data at rest: AES-256
• Chat messages encrypted end-to-end

2. Infrastructure
• Servers hosted in India and Asia-proof regions
• Firewalls, DDoS protection, access logs

3. Access Control
• Staff access is limited
• Multi-factor security on admin panel

4. Monitoring
• 24/7 automated threat monitoring
• Abuse detection
• Fraud prevention AI

5. Backup & Recovery
• Daily secure backups
• Region-redundant storage`
  },
  {
    id: "gdpr_compliance",
    title: "GDPR Compliance",
    icon: <Globe className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – GDPR COMPLIANCE STATEMENT

1. Lawful Basis
We process user data under:
• Consent
• Legitimate Interest
• Legal obligation

2. Data Subject Rights
EU users may:
• Access data
• Request data deletion
• Correct data
• Restrict processing
• Withdraw consent
• Request portability

3. Cross-Border Transfers
User data may be transferred to India and Asia.
We use:
• Standard Contractual Clauses (SCC)
• Encryption
• Privacy-by-design`
  },
  {
    id: "data_storage_policy",
    title: "Data Storage & Localization",
    icon: <Database className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – DATA STORAGE & LOCALIZATION POLICY

1. Storage Regions
Your data may be stored in:
• India
• Asia (Singapore, Japan, Indonesia, UAE)
• Compliant with local & global privacy laws

2. User Consent
By using Meow Meow, you fully consent to storage and processing in India or Asia.

3. Compliance
Fully adheres to:
• DPDP India Act 2023
• GDPR
• CCPA
• ISO 27001

4. Security Measures
• Encrypted databases
• Redundant backups
• Access isolation`
  },
  {
    id: "user_guidelines",
    title: "User Guidelines",
    icon: <Users className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – USER GUIDELINES

Allowed Behavior
• Respect others
• Use real information
• Follow safety rules

Not Allowed
• Harassment
• Sexual content
• Asking for money
• Sharing contact details
• External communication (WhatsApp, Instagram, etc.)
• Fraud or scams`
  },
  {
    id: "anti_sexual_content",
    title: "Anti-Sexual Content Policy",
    icon: <Ban className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – ANTI-SEXUAL CONTENT POLICY

Zero Tolerance:
• Erotic chats
• Sexual roleplay
• Nudity
• Pornographic content
• Sexual harassment
• Sexual exploitation
• Minor sexual content (permanent ban + law enforcement report)

Violations will result in immediate account suspension and potential legal action.`
  },
  {
    id: "payments_policy",
    title: "Payments & Payouts",
    icon: <CreditCard className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – PAYMENTS & PAYOUTS POLICY

For Men
• Wallet recharge
• No refunds
• Chargebacks = instant ban

For Women
• Earn from chat engagement
• ID verification required
• Minimum payout threshold
• Fraud forfeits earnings`
  },
  {
    id: "content_moderation",
    title: "Content Moderation",
    icon: <Eye className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – CONTENT MODERATION POLICY

Actions Taken
• Warning
• Temporary suspension
• Permanent ban
• Shadow ban
• Legal escalation

Moderation Tools
• AI detection
• Manual review
• Keyword filters

All content is subject to review and moderation to ensure platform safety.`
  },
  {
    id: "age_verification",
    title: "Age Verification",
    icon: <UserCheck className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – AGE VERIFICATION POLICY

• Minimum age 18
• AI-assisted face/age verification
• Fake age → immediate ban
• No minor content allowed

All users must verify their age before accessing the platform.`
  },
  {
    id: "ai_disclosure",
    title: "AI Usage Disclosure",
    icon: <Bot className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – AI USAGE DISCLOSURE

AI is used for:
• Auto-translation (NLLB-200)
• Gender verification
• Fraud prevention
• Content moderation
• Age estimation

AI is NOT used for:
• Final suspension decisions
• Payout approvals

All AI-assisted decisions are subject to human review upon user request.`
  },
  {
    id: "data_retention",
    title: "Data Retention",
    icon: <Clock className="w-4 h-4" />,
    required: true,
    content: `MEOW MEOW – DATA RETENTION POLICY

Data Type              | Retention Period
-----------------------|------------------
Chat messages          | 15 minutes
Payment records        | 7 years
Device logs            | 30–90 days
Account data           | Until user deletes
Fraud data             | 90 days

Users may request early deletion of their data by contacting support, subject to legal requirements.`
  }
];

const TermsAgreementScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | undefined>("terms_of_service");
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [agreeAll, setAgreeAll] = useState(false);

  const allRequiredAgreed = legalDocuments
    .filter(doc => doc.required)
    .every(doc => consents[doc.id]);

  const agreedCount = Object.values(consents).filter(Boolean).length;

  const handleToggleConsent = (docId: string) => {
    setConsents(prev => {
      const newConsents = { ...prev, [docId]: !prev[docId] };
      const allAgreed = legalDocuments.every(doc => newConsents[doc.id]);
      setAgreeAll(allAgreed);
      return newConsents;
    });
  };

  const handleAgreeAll = () => {
    const newAgreeAll = !agreeAll;
    setAgreeAll(newAgreeAll);
    const newConsents: Record<string, boolean> = {};
    legalDocuments.forEach(doc => {
      newConsents[doc.id] = newAgreeAll;
    });
    setConsents(newConsents);
  };

  const handleSubmit = async () => {
    if (!allRequiredAgreed) {
      toast({
        title: "Agreement required",
        description: "Please agree to all required policies to continue.",
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
          agreed_terms: consents.terms_of_service,
          gdpr_consent: consents.gdpr_compliance,
          ccpa_consent: consents.gdpr_compliance,
          dpdp_consent: consents.data_storage_policy,
          terms_version: "1.0",
          consent_timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      toast({
        title: "All Policies Accepted",
        description: "Thank you for agreeing to our policies. Proceeding to verification...",
      });

      navigate("/ai-processing");
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
        <ProgressIndicator currentStep={7} totalSteps={9} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-6 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Legal Agreements</h1>
            <p className="text-muted-foreground">
              Please read and accept all policies to continue
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                allRequiredAgreed 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {agreedCount}/{legalDocuments.length} Accepted
              </div>
            </div>
          </div>

          {/* Agree All Checkbox */}
          <label
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              agreeAll
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Checkbox
              checked={agreeAll}
              onCheckedChange={handleAgreeAll}
              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-foreground">
                I agree to ALL policies and terms
              </span>
              <p className="text-sm text-muted-foreground">
                Check this to accept all {legalDocuments.length} legal documents at once
              </p>
            </div>
            {agreeAll && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
          </label>

          {/* Legal Documents Accordion */}
          <ScrollArea className="h-[400px] rounded-xl border border-border bg-muted/20 p-4">
            <Accordion 
              type="single" 
              collapsible 
              value={expandedDoc}
              onValueChange={setExpandedDoc}
              className="space-y-2"
            >
              {legalDocuments.map((doc) => (
                <AccordionItem 
                  key={doc.id} 
                  value={doc.id}
                  className={`border rounded-lg px-4 transition-all ${
                    consents[doc.id] 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-border bg-card/50'
                  }`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        consents[doc.id] 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {doc.icon}
                      </div>
                      <span className="font-medium text-foreground text-left">
                        {doc.title}
                      </span>
                      {doc.required && (
                        <span className="text-xs text-destructive">*Required</span>
                      )}
                      {consents[doc.id] && (
                        <Check className="w-4 h-4 text-emerald-500 ml-auto mr-2" />
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                      <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                        {doc.content}
                      </pre>
                    </div>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        consents[doc.id]
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={consents[doc.id] || false}
                        onCheckedChange={() => handleToggleConsent(doc.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <span className="text-sm font-medium text-foreground">
                        I have read and agree to the {doc.title}
                      </span>
                    </label>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              variant="auroraOutline"
              onClick={() => navigate("/language-preferences")}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              variant="aurora"
              onClick={handleSubmit}
              disabled={isLoading || !allRequiredAgreed}
              className="flex-1 h-12 text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Accept All & Continue
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-center text-muted-foreground">
            Your consent will be recorded with a timestamp for GDPR, CCPA, and DPDP compliance.
            You can withdraw consent at any time from Settings.
          </p>
        </Card>
      </main>
    </div>
  );
};

export default TermsAgreementScreen;
