import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

// Country data with codes, names, and dial codes
const COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", format: "00000 00000" },
  { code: "US", name: "United States", dialCode: "+1", format: "(000) 000-0000" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", format: "00000 000000" },
  { code: "CA", name: "Canada", dialCode: "+1", format: "(000) 000-0000" },
  { code: "AU", name: "Australia", dialCode: "+61", format: "0000 000 000" },
  { code: "DE", name: "Germany", dialCode: "+49", format: "000 00000000" },
  { code: "FR", name: "France", dialCode: "+33", format: "0 00 00 00 00" },
  { code: "JP", name: "Japan", dialCode: "+81", format: "00-0000-0000" },
  { code: "CN", name: "China", dialCode: "+86", format: "000 0000 0000" },
  { code: "BR", name: "Brazil", dialCode: "+55", format: "(00) 00000-0000" },
  { code: "ZA", name: "South Africa", dialCode: "+27", format: "000 000 0000" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", format: "00 000 0000" },
  { code: "SG", name: "Singapore", dialCode: "+65", format: "0000 0000" },
  { code: "MY", name: "Malaysia", dialCode: "+60", format: "00-000 0000" },
  { code: "PH", name: "Philippines", dialCode: "+63", format: "0000 000 0000" },
  { code: "ID", name: "Indonesia", dialCode: "+62", format: "0000-0000-000" },
  { code: "TH", name: "Thailand", dialCode: "+66", format: "00 000 0000" },
  { code: "VN", name: "Vietnam", dialCode: "+84", format: "000 000 00 00" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", format: "0000-000000" },
  { code: "PK", name: "Pakistan", dialCode: "+92", format: "0000 0000000" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", format: "00 000 0000" },
  { code: "MX", name: "Mexico", dialCode: "+52", format: "000 000 0000" },
  { code: "IT", name: "Italy", dialCode: "+39", format: "000 000 0000" },
  { code: "ES", name: "Spain", dialCode: "+34", format: "000 00 00 00" },
  { code: "NL", name: "Netherlands", dialCode: "+31", format: "0 00000000" },
  { code: "RU", name: "Russia", dialCode: "+7", format: "(000) 000-00-00" },
  { code: "KR", name: "South Korea", dialCode: "+82", format: "00-0000-0000" },
  { code: "TR", name: "Turkey", dialCode: "+90", format: "(000) 000 00 00" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", format: "00 000 0000" },
  { code: "EG", name: "Egypt", dialCode: "+20", format: "000 000 0000" },
  { code: "NG", name: "Nigeria", dialCode: "+234", format: "0000 000 0000" },
  { code: "KE", name: "Kenya", dialCode: "+254", format: "0000 000000" },
  { code: "AR", name: "Argentina", dialCode: "+54", format: "00 0000-0000" },
  { code: "CL", name: "Chile", dialCode: "+56", format: "0 0000 0000" },
  { code: "CO", name: "Colombia", dialCode: "+57", format: "000 0000000" },
  { code: "PE", name: "Peru", dialCode: "+51", format: "000 000 000" },
  { code: "VE", name: "Venezuela", dialCode: "+58", format: "0000-0000000" },
  { code: "PL", name: "Poland", dialCode: "+48", format: "000 000 000" },
  { code: "SE", name: "Sweden", dialCode: "+46", format: "00-000 00 00" },
  { code: "NO", name: "Norway", dialCode: "+47", format: "000 00 000" },
  { code: "DK", name: "Denmark", dialCode: "+45", format: "00 00 00 00" },
  { code: "FI", name: "Finland", dialCode: "+358", format: "00 0000000" },
  { code: "GR", name: "Greece", dialCode: "+30", format: "000 000 0000" },
  { code: "PT", name: "Portugal", dialCode: "+351", format: "000 000 000" },
  { code: "BE", name: "Belgium", dialCode: "+32", format: "000 00 00 00" },
  { code: "AT", name: "Austria", dialCode: "+43", format: "000 0000000" },
  { code: "CH", name: "Switzerland", dialCode: "+41", format: "00 000 00 00" },
  { code: "IE", name: "Ireland", dialCode: "+353", format: "00 000 0000" },
  { code: "IL", name: "Israel", dialCode: "+972", format: "00-000-0000" },
  { code: "QA", name: "Qatar", dialCode: "+974", format: "0000 0000" },
];

interface CustomPhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  international?: boolean;
  defaultCountry?: string;
}

export const CustomPhoneInput: React.FC<CustomPhoneInputProps> = ({
  value = "",
  onChange,
  onBlur,
  placeholder = "Enter phone number",
  disabled = false,
  className = "",
  international = true,
  defaultCountry = "IN",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0]
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse the phone number to extract country code and number
  useEffect(() => {
    if (value && value.startsWith("+")) {
      // Find matching country by dial code
      const matchedCountry = COUNTRIES.find((country) =>
        value.startsWith(country.dialCode)
      );
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");

    // Update the phone number with new country code
    const currentNumber = value?.replace(selectedCountry.dialCode, "") || "";
    const newValue = country.dialCode + currentNumber.replace(/^\+?\d+\s*/, "");
    onChange?.(newValue || undefined);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Remove all non-digit characters except +
    const cleaned = inputValue.replace(/[^\d+]/g, "");

    // If the input starts with +, try to match a country
    if (cleaned.startsWith("+")) {
      const matchedCountry = COUNTRIES.find((country) =>
        cleaned.startsWith(country.dialCode)
      );
      if (matchedCountry && matchedCountry.code !== selectedCountry.code) {
        setSelectedCountry(matchedCountry);
      }
      onChange?.(cleaned || undefined);
    } else {
      // Ensure the country code is included
      const numberWithoutCode = cleaned.replace(selectedCountry.dialCode.replace("+", ""), "");
      const newValue = selectedCountry.dialCode + numberWithoutCode;
      onChange?.(newValue || undefined);
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the display number (without country code for better UX)
  const displayNumber = value
    ? value.replace(selectedCountry.dialCode, "").trim()
    : "";

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-1">
        {/* Country Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed h-10"
          >
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-72 bg-background border rounded-md shadow-lg max-h-60 overflow-hidden">
              {/* Search */}
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Country List */}
              <div className="overflow-y-auto max-h-48">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent text-left ${
                        selectedCountry.code === country.code
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      <span className="flex-1">{country.name}</span>
                      <span className="text-muted-foreground">
                        {country.dialCode}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={international ? value : displayNumber}
          onChange={handlePhoneNumberChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed h-10"
        />
      </div>
    </div>
  );
};

// Phone validation function
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber) return false;

  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Check if it starts with + and has a country code
  if (!cleaned.startsWith("+")) return false;

  // Find the matching country
  const country = COUNTRIES.find((c) => cleaned.startsWith(c.dialCode));
  if (!country) return false;

  // Get the number without country code
  const numberWithoutCode = cleaned.replace(country.dialCode, "");

  // Basic validation: should have at least 6 digits and max 15 digits
  // (E.164 format allows up to 15 digits total)
  const totalDigits = cleaned.replace(/\D/g, "").length;
  return numberWithoutCode.length >= 6 && totalDigits <= 15;
};
