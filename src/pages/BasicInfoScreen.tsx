import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, User, Calendar, Heart, Mail, Phone } from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say" | "";

const genderOptions = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
  { value: "non-binary", label: "Non-Binary", emoji: "🧑" },
  { value: "prefer-not-to-say", label: "Prefer not to say", emoji: "🤫" },
];

const phoneSchema = z.string().regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid phone number");

const BasicInfoScreen = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [gender, setGender] = useState<Gender>("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState<{
    fullName?: string;
    dob?: string;
    gender?: string;
    phone?: string;
  }>({});
  const [shakeField, setShakeField] = useState<string | null>(null);
  const [touched, setTouched] = useState<{
    fullName?: boolean;
    dob?: boolean;
    gender?: boolean;
    phone?: boolean;
  }>({});

  // Fetch user email on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    getUser();
  }, []);

  // Trigger shake animation
  const triggerShake = (field: string) => {
    setShakeField(field);
    setTimeout(() => setShakeField(null), 500);
  };

  // Validate full name
  const validateFullName = (value: string) => {
    if (!value.trim()) return "Full name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (value.trim().length > 50) return "Name must be less than 50 characters";
    if (!/^[a-zA-Z\s\-'\.]+$/.test(value.trim())) return "Please enter a valid name";
    return undefined;
  };

  // Validate DOB
  const validateDob = (value: Date | undefined) => {
    if (!value) return "Date of birth is required";
    const age = differenceInYears(new Date(), value);
    if (age < 18) return "You must be at least 18 years old";
    if (age > 120) return "Please enter a valid date of birth";
    return undefined;
  };

  // Validate gender
  const validateGender = (value: Gender) => {
    if (!value) return "Please select your gender";
    return undefined;
  };

  // Validate phone
  const validatePhone = (value: string) => {
    if (!value.trim()) return "Phone number is required";
    const result = phoneSchema.safeParse(value.trim());
    if (!result.success) return result.error.errors[0].message;
    return undefined;
  };

  // Handle field blur
  const handleBlur = (field: "fullName" | "dob" | "gender" | "phone") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    
    let error: string | undefined;
    if (field === "fullName") {
      error = validateFullName(fullName);
    } else if (field === "dob") {
      error = validateDob(dob);
    } else if (field === "gender") {
      error = validateGender(gender);
    } else if (field === "phone") {
      error = validatePhone(phone);
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      triggerShake(field);
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculate age display
  const getAgeDisplay = () => {
    if (!dob) return null;
    const age = differenceInYears(new Date(), dob);
    return age;
  };

  const handleNext = () => {
    // Validate all fields
    const fullNameError = validateFullName(fullName);
    const dobError = validateDob(dob);
    const genderError = validateGender(gender);
    const phoneError = validatePhone(phone);

    const newErrors = {
      fullName: fullNameError,
      dob: dobError,
      gender: genderError,
      phone: phoneError,
    };

    setErrors(newErrors);
    setTouched({ fullName: true, dob: true, gender: true, phone: true });

    // Shake invalid fields
    if (fullNameError) triggerShake("fullName");
    else if (phoneError) triggerShake("phone");
    else if (dobError) triggerShake("dob");
    else if (genderError) triggerShake("gender");

    if (fullNameError || dobError || genderError || phoneError) {
      toast({
        title: "Please complete all fields",
        description: "All information is required to continue.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Looking great! 🌟",
      description: "Your basic info has been saved.",
    });
    
    // Store data for next screens
    localStorage.setItem("userGender", gender);
    localStorage.setItem("userPhone", phone);
    
    // Navigate to password setup screen
    navigate("/password-setup");
  };

  const handleBack = () => {
    navigate("/language-country");
  };

  const isComplete = fullName.trim() && dob && gender && phone.trim();

  // Get default month for calendar (18 years ago)
  const defaultMonth = new Date();
  defaultMonth.setFullYear(defaultMonth.getFullYear() - 18);

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <ProgressIndicator currentStep={2} totalSteps={10} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pb-8">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fade-in">
          <MeowLogo size="md" className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Tell us about you
          </h1>
          <p className="text-muted-foreground text-base max-w-xs mx-auto">
            Help us personalize your experience
          </p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-md bg-card/80 backdrop-blur-sm rounded-3xl p-6 shadow-card border border-border/30 animate-slide-up">
          <div className="space-y-6">
            {/* Email (Read-only) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mail className="w-4 h-4 text-primary" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                disabled
                className="h-12 rounded-xl border-2 border-input bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email from your account</p>
            </div>

            {/* Phone Number */}
            <div 
              className={cn(
                "space-y-2 transition-all",
                shakeField === "phone" && "animate-shake"
              )}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Phone className="w-4 h-4 text-primary" />
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (touched.phone) {
                    const error = validatePhone(e.target.value);
                    setErrors((prev) => ({ ...prev, phone: error }));
                  }
                }}
                onBlur={() => handleBlur("phone")}
                className={cn(
                  "h-12 rounded-xl border-2 transition-all focus:ring-2 focus:ring-primary/20",
                  errors.phone && touched.phone 
                    ? "border-destructive focus:border-destructive" 
                    : "border-input focus:border-primary"
                )}
              />
              {errors.phone && touched.phone && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                  <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div 
              className={cn(
                "space-y-2 transition-all",
                shakeField === "fullName" && "animate-shake"
              )}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="w-4 h-4 text-primary" />
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (touched.fullName) {
                    const error = validateFullName(e.target.value);
                    setErrors((prev) => ({ ...prev, fullName: error }));
                  }
                }}
                onBlur={() => handleBlur("fullName")}
                className={cn(
                  "h-12 rounded-xl border-2 transition-all focus:ring-2 focus:ring-primary/20",
                  errors.fullName && touched.fullName 
                    ? "border-destructive focus:border-destructive" 
                    : "border-input focus:border-primary"
                )}
              />
              {errors.fullName && touched.fullName && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                  <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Date of Birth */}
            <div 
              className={cn(
                "space-y-2 transition-all",
                shakeField === "dob" && "animate-shake"
              )}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                Date of Birth
                {getAgeDisplay() && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {getAgeDisplay()} years old
                  </span>
                )}
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 rounded-xl border-2 justify-start text-left font-normal transition-all",
                      !dob && "text-muted-foreground",
                      errors.dob && touched.dob 
                        ? "border-destructive focus:border-destructive" 
                        : "border-input focus:border-primary hover:border-primary/50"
                    )}
                    onClick={() => setCalendarOpen(true)}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {dob ? format(dob, "MMMM d, yyyy") : "Select your birthday"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={dob}
                    onSelect={(date) => {
                      setDob(date);
                      setCalendarOpen(false);
                      setTouched((prev) => ({ ...prev, dob: true }));
                      const error = validateDob(date);
                      setErrors((prev) => ({ ...prev, dob: error }));
                      if (error) triggerShake("dob");
                    }}
                    defaultMonth={defaultMonth}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className="p-3 pointer-events-auto bg-popover rounded-xl"
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear() - 18}
                  />
                </PopoverContent>
              </Popover>
              {errors.dob && touched.dob && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                  <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                  {errors.dob}
                </p>
              )}
            </div>

            {/* Gender Selection */}
            <div 
              className={cn(
                "space-y-3 transition-all",
                shakeField === "gender" && "animate-shake"
              )}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart className="w-4 h-4 text-primary" />
                Gender
              </label>
              <div className="grid grid-cols-2 gap-3">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGender(option.value as Gender);
                      setTouched((prev) => ({ ...prev, gender: true }));
                      setErrors((prev) => ({ ...prev, gender: undefined }));
                    }}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      "hover:border-primary/50 hover:bg-primary/5",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20",
                      gender === option.value
                        ? "border-primary bg-primary/10 shadow-soft"
                        : "border-input bg-background/50",
                      errors.gender && touched.gender && !gender
                        ? "border-destructive/50"
                        : ""
                    )}
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className={cn(
                      "text-sm font-medium",
                      gender === option.value ? "text-primary" : "text-foreground"
                    )}>
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.gender && touched.gender && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-fade-in">
                  <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
                  {errors.gender}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-8" />

        {/* CTA Button */}
        <div className="w-full max-w-md animate-slide-up" style={{ animationDelay: "200ms" }}>
          <Button
            variant="hero"
            size="xl"
            className="w-full group"
            onClick={handleNext}
            disabled={!isComplete}
          >
            Continue
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>
          
          <p className="text-center text-xs text-muted-foreground mt-4">
            Your information is securely stored and never shared
          </p>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="fixed top-32 right-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="fixed bottom-40 left-8 w-28 h-28 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
    </div>
  );
};

export default BasicInfoScreen;
