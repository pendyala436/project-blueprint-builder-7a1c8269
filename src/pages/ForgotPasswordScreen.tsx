import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import MeowLogo from "@/components/MeowLogo";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Phone,
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  KeyRound
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const phoneSchema = z.string().min(10, "Please enter a valid phone number");

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setEmailError(emailResult.error.errors[0].message);
      hasError = true;
    } else {
      setEmailError("");
    }

    // Validate phone
    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      setPhoneError(phoneResult.error.errors[0].message);
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (hasError) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <header className="p-6 flex justify-center">
          <MeowLogo />
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8 space-y-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl animate-fade-in">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 animate-bounce-in">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
              <p className="text-muted-foreground">
                We've sent a password reset link to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-sm text-center text-muted-foreground">
                Didn't receive it? Check your spam folder or try again.
              </p>

              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                  setPhone("");
                }}
                className="w-full h-12"
              >
                Try Again
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-center">
        <MeowLogo />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 space-y-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-xl animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
              <p className="text-muted-foreground">
                Enter your email and phone number to reset your password.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  className={`pl-12 h-12 ${emailError ? "border-destructive" : ""}`}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive animate-fade-in">{emailError}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError("");
                  }}
                  className={`pl-12 h-12 ${phoneError ? "border-destructive" : ""}`}
                />
              </div>
              {phoneError && (
                <p className="text-sm text-destructive animate-fade-in">{phoneError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-medium"
              variant="gradient"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default ForgotPasswordScreen;