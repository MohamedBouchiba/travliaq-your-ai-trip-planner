import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useFilteredCities, City } from "@/hooks/useCities";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CitySearchProps {
  value: string;
  onChange: (value: string) => void;
  cities: City[] | undefined;
  citiesLoading: boolean;
  placeholder: string;
  onEnterPress?: () => void;
  autoFocus?: boolean;
}

export const CitySearch = ({
  value,
  onChange,
  cities,
  citiesLoading,
  placeholder,
  onEnterPress,
  autoFocus = false
}: CitySearchProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCities = useFilteredCities(search, cities);

  // Sync external value changes
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    setShowDropdown(true);
  };

  const handleCitySelect = (city: City) => {
    const cityDisplay = `${city.name}, ${city.country} ${city.country_code}`;
    setSearch(cityDisplay);
    onChange(cityDisplay);
    setShowDropdown(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress) {
      onEnterPress();
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="h-12 text-base"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onKeyPress={handleKeyPress}
        disabled={citiesLoading}
      />
      
      {citiesLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {showDropdown && !citiesLoading && filteredCities.length > 0 && search.length > 0 && (
        <Card ref={dropdownRef} className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto pointer-events-auto">
          <Command>
            <CommandList>
              <CommandGroup>
                {filteredCities.slice(0, 15).map((city) => (
                  <CommandItem
                    key={city.id}
                    onSelect={() => handleCitySelect(city)}
                    className="cursor-pointer"
                  >
                    {city.name}, {city.country} {city.country_code}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </Card>
      )}

      {showDropdown && !citiesLoading && search.length > 0 && filteredCities.length === 0 && (
        <Card ref={dropdownRef} className="absolute z-50 w-full mt-2 p-3 pointer-events-auto">
          <p className="text-sm text-muted-foreground text-center">
            {t('questionnaire.noCityFound')} "{search}"
          </p>
        </Card>
      )}
    </div>
  );
};
