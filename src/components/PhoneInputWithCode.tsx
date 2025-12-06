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

// Complete list of all countries with flag emojis and dial codes
export const countryCodes = [
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
  { code: "AS", name: "American Samoa", dialCode: "+1684", flag: "🇦🇸" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "🇦🇩" },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
  { code: "AI", name: "Anguilla", dialCode: "+1264", flag: "🇦🇮" },
  { code: "AG", name: "Antigua and Barbuda", dialCode: "+1268", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "🇦🇲" },
  { code: "AW", name: "Aruba", dialCode: "+297", flag: "🇦🇼" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", dialCode: "+994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", dialCode: "+1242", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", dialCode: "+1246", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", dialCode: "+501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", dialCode: "+229", flag: "🇧🇯" },
  { code: "BM", name: "Bermuda", dialCode: "+1441", flag: "🇧🇲" },
  { code: "BT", name: "Bhutan", dialCode: "+975", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "+387", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", dialCode: "+267", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "IO", name: "British Indian Ocean Territory", dialCode: "+246", flag: "🇮🇴" },
  { code: "BN", name: "Brunei", dialCode: "+673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", dialCode: "+257", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "🇨🇲" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde", dialCode: "+238", flag: "🇨🇻" },
  { code: "KY", name: "Cayman Islands", dialCode: "+1345", flag: "🇰🇾" },
  { code: "CF", name: "Central African Republic", dialCode: "+236", flag: "🇨🇫" },
  { code: "TD", name: "Chad", dialCode: "+235", flag: "🇹🇩" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", dialCode: "+269", flag: "🇰🇲" },
  { code: "CG", name: "Congo", dialCode: "+242", flag: "🇨🇬" },
  { code: "CD", name: "Congo (DRC)", dialCode: "+243", flag: "🇨🇩" },
  { code: "CK", name: "Cook Islands", dialCode: "+682", flag: "🇨🇰" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
  { code: "CW", name: "Curaçao", dialCode: "+599", flag: "🇨🇼" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", dialCode: "+253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", dialCode: "+1767", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1809", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", dialCode: "+291", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", dialCode: "+268", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "🇪🇹" },
  { code: "FK", name: "Falkland Islands", dialCode: "+500", flag: "🇫🇰" },
  { code: "FO", name: "Faroe Islands", dialCode: "+298", flag: "🇫🇴" },
  { code: "FJ", name: "Fiji", dialCode: "+679", flag: "🇫🇯" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "GF", name: "French Guiana", dialCode: "+594", flag: "🇬🇫" },
  { code: "PF", name: "French Polynesia", dialCode: "+689", flag: "🇵🇫" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", dialCode: "+220", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", dialCode: "+995", flag: "🇬🇪" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", dialCode: "+350", flag: "🇬🇮" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "GL", name: "Greenland", dialCode: "+299", flag: "🇬🇱" },
  { code: "GD", name: "Grenada", dialCode: "+1473", flag: "🇬🇩" },
  { code: "GP", name: "Guadeloupe", dialCode: "+590", flag: "🇬🇵" },
  { code: "GU", name: "Guam", dialCode: "+1671", flag: "🇬🇺" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "GG", name: "Guernsey", dialCode: "+44", flag: "🇬🇬" },
  { code: "GN", name: "Guinea", dialCode: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", dialCode: "+592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", dialCode: "+509", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "🇮🇸" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "IM", name: "Isle of Man", dialCode: "+44", flag: "🇮🇲" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", dialCode: "+1876", flag: "🇯🇲" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "JE", name: "Jersey", dialCode: "+44", flag: "🇯🇪" },
  { code: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", dialCode: "+686", flag: "🇰🇮" },
  { code: "XK", name: "Kosovo", dialCode: "+383", flag: "🇽🇰" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996", flag: "🇰🇬" },
  { code: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", dialCode: "+266", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
  { code: "LY", name: "Libya", dialCode: "+218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "🇱🇺" },
  { code: "MO", name: "Macau", dialCode: "+853", flag: "🇲🇴" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "🇲🇰" },
  { code: "MG", name: "Madagascar", dialCode: "+261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", dialCode: "+265", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", dialCode: "+960", flag: "🇲🇻" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", dialCode: "+692", flag: "🇲🇭" },
  { code: "MQ", name: "Martinique", dialCode: "+596", flag: "🇲🇶" },
  { code: "MR", name: "Mauritania", dialCode: "+222", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "🇲🇺" },
  { code: "YT", name: "Mayotte", dialCode: "+262", flag: "🇾🇹" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", dialCode: "+691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", dialCode: "+976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "🇲🇪" },
  { code: "MS", name: "Montserrat", dialCode: "+1664", flag: "🇲🇸" },
  { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", dialCode: "+264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", dialCode: "+674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "NC", name: "New Caledonia", dialCode: "+687", flag: "🇳🇨" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "NU", name: "Niue", dialCode: "+683", flag: "🇳🇺" },
  { code: "NF", name: "Norfolk Island", dialCode: "+672", flag: "🇳🇫" },
  { code: "KP", name: "North Korea", dialCode: "+850", flag: "🇰🇵" },
  { code: "MP", name: "Northern Mariana Islands", dialCode: "+1670", flag: "🇲🇵" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "PW", name: "Palau", dialCode: "+680", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", dialCode: "+970", flag: "🇵🇸" },
  { code: "PA", name: "Panama", dialCode: "+507", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1787", flag: "🇵🇷" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "RE", name: "Réunion", dialCode: "+262", flag: "🇷🇪" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", dialCode: "+250", flag: "🇷🇼" },
  { code: "BL", name: "Saint Barthélemy", dialCode: "+590", flag: "🇧🇱" },
  { code: "SH", name: "Saint Helena", dialCode: "+290", flag: "🇸🇭" },
  { code: "KN", name: "Saint Kitts and Nevis", dialCode: "+1869", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", dialCode: "+1758", flag: "🇱🇨" },
  { code: "MF", name: "Saint Martin", dialCode: "+590", flag: "🇲🇫" },
  { code: "PM", name: "Saint Pierre and Miquelon", dialCode: "+508", flag: "🇵🇲" },
  { code: "VC", name: "Saint Vincent and the Grenadines", dialCode: "+1784", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", dialCode: "+685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "🇸🇲" },
  { code: "ST", name: "São Tomé and Príncipe", dialCode: "+239", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", dialCode: "+248", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "SX", name: "Sint Maarten", dialCode: "+1721", flag: "🇸🇽" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", dialCode: "+252", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "SS", name: "South Sudan", dialCode: "+211", flag: "🇸🇸" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", dialCode: "+249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", dialCode: "+597", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "SY", name: "Syria", dialCode: "+963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", dialCode: "+670", flag: "🇹🇱" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "TK", name: "Tokelau", dialCode: "+690", flag: "🇹🇰" },
  { code: "TO", name: "Tonga", dialCode: "+676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "+1868", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993", flag: "🇹🇲" },
  { code: "TC", name: "Turks and Caicos Islands", dialCode: "+1649", flag: "🇹🇨" },
  { code: "TV", name: "Tuvalu", dialCode: "+688", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", dialCode: "+678", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", dialCode: "+379", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "VG", name: "British Virgin Islands", dialCode: "+1284", flag: "🇻🇬" },
  { code: "VI", name: "U.S. Virgin Islands", dialCode: "+1340", flag: "🇻🇮" },
  { code: "WF", name: "Wallis and Futuna", dialCode: "+681", flag: "🇼🇫" },
  { code: "EH", name: "Western Sahara", dialCode: "+212", flag: "🇪🇭" },
  { code: "YE", name: "Yemen", dialCode: "+967", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", dialCode: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼" },
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
