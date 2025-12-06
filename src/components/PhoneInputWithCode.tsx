/**
 * PhoneInputWithCode.tsx
 * Phone input component with country code selector dropdown.
 * Shows flag emoji and dial code for each country.
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Country codes with flag emojis and dial codes
export const countryCodes = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
];

interface PhoneInputWithCodeProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  className?: string;
  placeholder?: string;
  defaultCountryCode?: string;
}

export default function PhoneInputWithCode({
  value,
  onChange,
  onBlur,
  error,
  className,
  placeholder = "Enter phone number",
  defaultCountryCode = "IN",
}: PhoneInputWithCodeProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find((c) => c.code === defaultCountryCode) || countryCodes[0]
  );

  // Parse existing value to extract country code if present
  useEffect(() => {
    if (value) {
      const matchedCountry = countryCodes.find((c) => value.startsWith(c.dialCode));
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
    }
  }, []);

  // Filter countries based on search
  const filteredCountries = countryCodes.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.dialCode.includes(search) ||
      country.code.toLowerCase().includes(search.toLowerCase())
  );

  // Handle country selection
  const handleCountrySelect = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
    
    // Update the phone value with new country code
    const phoneWithoutCode = value.replace(/^\+\d+/, "").trim();
    onChange(country.dialCode + phoneWithoutCode);
  };

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Only allow numbers after the country code
    const numbersOnly = inputValue.replace(/[^\d]/g, "");
    onChange(selectedCountry.dialCode + numbersOnly);
  };

  // Get the phone number without country code for display
  const getPhoneWithoutCode = () => {
    if (!value) return "";
    return value.replace(selectedCountry.dialCode, "").replace(/^\+\d+/, "");
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Country Code Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-[100px] h-12 rounded-xl border-2 justify-between px-3",
              "hover:bg-accent/50 focus:ring-2 focus:ring-primary/20",
              error ? "border-destructive" : "border-input focus:border-primary"
            )}
          >
            <span className="flex items-center gap-1.5 text-base">
              <span>{selectedCountry.flag}</span>
              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[280px] p-0 bg-popover border border-border shadow-lg z-50" 
          align="start"
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          
          {/* Country List */}
          <ScrollArea className="h-[250px]">
            <div className="p-1">
              {filteredCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No country found
                </p>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left",
                      "hover:bg-accent transition-colors",
                      selectedCountry.code === country.code && "bg-accent"
                    )}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{country.name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {country.dialCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Phone Number Input */}
      <Input
        type="tel"
        placeholder={placeholder}
        value={getPhoneWithoutCode()}
        onChange={handlePhoneChange}
        onBlur={onBlur}
        className={cn(
          "flex-1 h-12 rounded-xl border-2 transition-all focus:ring-2 focus:ring-primary/20",
          error ? "border-destructive focus:border-destructive" : "border-input focus:border-primary"
        )}
      />
    </div>
  );
}
