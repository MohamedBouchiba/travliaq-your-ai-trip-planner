import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useCitySearch, City } from "@/hooks/useCitySearch";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onEnterPress?: () => void;
  autoFocus?: boolean;
}

export const CitySearch = ({
  value,
  onChange,
  placeholder,
  onEnterPress,
  autoFocus = false
}: CitySearchProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasUserInput, setHasUserInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recherche en temps réel dans la base de données
  const { data: cities, isLoading: citiesLoading, isFetching } = useCitySearch(search, showDropdown);

  // Sync external value changes seulement si l'utilisateur n'est pas en train de taper
  useEffect(() => {
    if (!hasUserInput && value !== search) {
      setSearch(value);
    }
  }, [value, hasUserInput, search]);

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
    setHasUserInput(true);
    setShowDropdown(true);
    // Ne pas appeler onChange immédiatement pour éviter les re-renders
  };

  const handleCitySelect = (city: City) => {
    const cityDisplay = `${city.name}, ${city.country} ${city.country_code}`;
    setSearch(cityDisplay);
    setHasUserInput(false);
    onChange(cityDisplay);
    setShowDropdown(false);
    // Remettre le focus sur l'input après la sélection
    setTimeout(() => inputRef.current?.blur(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnterPress) {
      setHasUserInput(false);
      onChange(search);
      onEnterPress();
    }
  };

  const handleBlur = () => {
    // Mettre à jour la valeur finale uniquement au blur si l'utilisateur a tapé
    if (hasUserInput) {
      setHasUserInput(false);
      onChange(search);
    }
  };

  // Déterminer si on doit afficher le dropdown et son contenu
  const shouldShowDropdown = showDropdown && search.length > 0;
  const isSearching = isFetching || citiesLoading;
  const hasCities = cities && cities.length > 0;
  const showNoCityMessage = !isSearching && !hasCities && hasUserInput;

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
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
      />
      
      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {shouldShowDropdown && (
        <>
          {hasCities ? (
            <Card 
              ref={dropdownRef} 
              className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto pointer-events-auto bg-background border shadow-lg"
              onMouseDown={(e) => e.preventDefault()} // Empêche le blur de l'input
            >
              <Command>
                <CommandList>
                  <CommandGroup>
                    {cities.map((city) => (
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
          ) : showNoCityMessage ? (
            <Card 
              ref={dropdownRef} 
              className="absolute z-50 w-full mt-2 p-3 pointer-events-auto bg-background border shadow-lg"
              onMouseDown={(e) => e.preventDefault()}
            >
              <p className="text-sm text-muted-foreground text-center">
                {t('questionnaire.noCityFound')} "{search}"
              </p>
            </Card>
          ) : null}
        </>
      )}

    </div>
  );
};
