import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MeowLogo from "@/components/MeowLogo";
import ProgressIndicator from "@/components/ProgressIndicator";
import SearchableSelect from "@/components/SearchableSelect";
import { languages } from "@/data/languages";
import { countries } from "@/data/countries";
import { toast } from "@/hooks/use-toast";

const LanguageCountryScreen = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const languageOptions = languages.map((lang) => ({
    value: lang.code,
    label: lang.name,
    sublabel: lang.nativeName,
    icon: "🗣️",
  }));

  const countryOptions = countries.map((country) => ({
    value: country.code,
    label: country.name,
    icon: country.flag,
  }));

  const handleNext = () => {
    if (!selectedLanguage || !selectedCountry) {
      toast({
        title: "Please complete your selection",
        description: "Both language and country are required to continue.",
        variant: "destructive",
      });
      return;
    }

    // Store preferences in sessionStorage for later use
    sessionStorage.setItem("selectedLanguage", selectedLanguage);
    sessionStorage.setItem("selectedCountry", selectedCountry);

    toast({
      title: "Preferences saved! 🎉",
      description: "Let's create your account.",
    });
    
    // Navigate to auth screen
    navigate("/auth");
  };

  const isComplete = selectedLanguage && selectedCountry;

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4">
        <ProgressIndicator currentStep={1} totalSteps={10} />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-6 pb-8">
        {/* Logo & Title */}
        <div className="text-center mb-10 animate-fade-in">
          <MeowLogo size="lg" className="mx-auto mb-6" />
          <h1 className="font-display text-4xl font-bold text-foreground mb-3">
            MEOW MEOW
          </h1>
          <p className="text-muted-foreground text-lg max-w-xs mx-auto">
            Find your purrfect match worldwide
          </p>
        </div>

        {/* Selection Card */}
        <div className="w-full max-w-md bg-card/80 backdrop-blur-sm rounded-3xl p-6 shadow-card border border-border/30 animate-slide-up">
          <div className="space-y-6">
            {/* Language Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="w-4 h-4 text-primary" />
                Mother Tongue
              </label>
              <SearchableSelect
                options={languageOptions}
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                placeholder="Select your language"
                searchPlaceholder="Search languages..."
              />
              <p className="text-xs text-muted-foreground pl-1">
                We'll match you with speakers of your language
              </p>
            </div>

            {/* Country Section */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                Country
              </label>
              <SearchableSelect
                options={countryOptions}
                value={selectedCountry}
                onChange={setSelectedCountry}
                placeholder="Select your country"
                searchPlaceholder="Search countries..."
              />
              <p className="text-xs text-muted-foreground pl-1">
                Find matches near you or explore globally
              </p>
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
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="fixed top-20 left-4 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="fixed bottom-32 right-4 w-32 h-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
    </div>
  );
};

export default LanguageCountryScreen;
