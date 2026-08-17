import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { getIpGeolocation } from '@/services/geo/ipGeolocation';

export type Currency = 'EUR' | 'USD' | 'GBP';
export type Language = 'fr' | 'en' | 'es';
export type TemperatureUnit = 'C' | 'F';

export interface UserPreferences {
  currency: Currency;
  language: Language;
  temperatureUnit: TemperatureUnit;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updateCurrency: (currency: Currency) => Promise<void>;
  updateLanguage: (language: Language) => Promise<void>;
  updateTemperatureUnit: (unit: TemperatureUnit) => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  currency: 'EUR',
  language: 'fr',
  temperatureUnit: 'C',
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};

import { STORAGE_KEYS } from "@/config/storageKeys";
const STORAGE_KEY = STORAGE_KEYS.USER_PREFERENCES;

// Mapping pays -> préférences par défaut
const countryToPreferences: Record<string, Partial<UserPreferences>> = {
  FR: { currency: 'EUR', language: 'fr', temperatureUnit: 'C' },
  BE: { currency: 'EUR', language: 'fr', temperatureUnit: 'C' },
  CH: { currency: 'EUR', language: 'fr', temperatureUnit: 'C' },
  CA: { currency: 'USD', language: 'fr', temperatureUnit: 'C' },
  US: { currency: 'USD', language: 'en', temperatureUnit: 'F' },
  GB: { currency: 'GBP', language: 'en', temperatureUnit: 'C' },
  UK: { currency: 'GBP', language: 'en', temperatureUnit: 'C' },
  DE: { currency: 'EUR', language: 'en', temperatureUnit: 'C' },
  ES: { currency: 'EUR', language: 'es', temperatureUnit: 'C' },
  MX: { currency: 'USD', language: 'es', temperatureUnit: 'C' },
  AR: { currency: 'USD', language: 'es', temperatureUnit: 'C' },
  CO: { currency: 'USD', language: 'es', temperatureUnit: 'C' },
  IT: { currency: 'EUR', language: 'en', temperatureUnit: 'C' },
  PT: { currency: 'EUR', language: 'en', temperatureUnit: 'C' },
  NL: { currency: 'EUR', language: 'en', temperatureUnit: 'C' },
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  // Charger depuis localStorage
  const loadFromStorage = useCallback((): UserPreferences | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  // Sauvegarder dans localStorage
  const saveToStorage = useCallback((prefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore
    }
  }, []);

  // Détection automatique par géolocalisation (via edge function, pas d'appel direct)
  const detectPreferences = useCallback(async (): Promise<UserPreferences> => {
    const data = await getIpGeolocation();
    const countryCode = data?.country_code?.toUpperCase();
    const countryPrefs = countryCode ? countryToPreferences[countryCode] : undefined;
    if (countryPrefs) {
      return { ...defaultPreferences, ...countryPrefs };
    }

    // Fallback sur navigator.language
    const browserLang = navigator.language?.toLowerCase();
    if (browserLang?.startsWith('en')) {
      return { ...defaultPreferences, language: 'en' };
    } else if (browserLang?.startsWith('es')) {
      return { ...defaultPreferences, language: 'es' };
    }
    return defaultPreferences;
  }, []);

  // Charger les préférences depuis Supabase
  const loadFromSupabase = useCallback(async (userId: string): Promise<UserPreferences | null> => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('currency, language, temperature_unit')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return {
        currency: (data.currency as Currency) || 'EUR',
        language: (data.language as Language) || 'fr',
        temperatureUnit: (data.temperature_unit as TemperatureUnit) || 'C',
      };
    } catch {
      return null;
    }
  }, []);

  // Sauvegarder dans Supabase
  const saveToSupabase = useCallback(async (userId: string, prefs: Partial<UserPreferences>) => {
    try {
      const updateData: Record<string, string> = {};
      if (prefs.currency) updateData.currency = prefs.currency;
      if (prefs.language) updateData.language = prefs.language;
      if (prefs.temperatureUnit) updateData.temperature_unit = prefs.temperatureUnit;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...updateData,
        }, { onConflict: 'user_id' });
    } catch {
      // Ignore
    }
  }, []);

  // Synchroniser i18n avec la langue
  useEffect(() => {
    if (preferences.language && i18n.language !== preferences.language) {
      i18n.changeLanguage(preferences.language);
    }
  }, [preferences.language, i18n]);

  // Charger les préférences au démarrage
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);

      // Si utilisateur connecté, charger depuis Supabase
      if (user) {
        const supabasePrefs = await loadFromSupabase(user.id);
        if (supabasePrefs) {
          setPreferences(supabasePrefs);
          saveToStorage(supabasePrefs);
          setLoading(false);
          return;
        }
        // Si pas de prefs en DB, utiliser localStorage et sauvegarder en DB
        const storedPrefs = loadFromStorage();
        if (storedPrefs) {
          setPreferences(storedPrefs);
          await saveToSupabase(user.id, storedPrefs);
          setLoading(false);
          return;
        }
      } else {
        // Non connecté : localStorage
        const storedPrefs = loadFromStorage();
        if (storedPrefs) {
          setPreferences(storedPrefs);
          setLoading(false);
          return;
        }
      }

      // Aucune préférence trouvée : détecter automatiquement
      const detected = await detectPreferences();
      setPreferences(detected);
      saveToStorage(detected);
      if (user) {
        await saveToSupabase(user.id, detected);
      }
      setLoading(false);
    };

    loadPreferences();
  }, [user, loadFromSupabase, loadFromStorage, saveToStorage, saveToSupabase, detectPreferences]);

  const updateCurrency = useCallback(async (currency: Currency) => {
    const newPrefs = { ...preferences, currency };
    setPreferences(newPrefs);
    saveToStorage(newPrefs);
    if (user) {
      await saveToSupabase(user.id, { currency });
    }
  }, [preferences, user, saveToStorage, saveToSupabase]);

  const updateLanguage = useCallback(async (language: Language) => {
    const newPrefs = { ...preferences, language };
    setPreferences(newPrefs);
    saveToStorage(newPrefs);
    i18n.changeLanguage(language);
    if (user) {
      await saveToSupabase(user.id, { language });
    }
  }, [preferences, user, saveToStorage, saveToSupabase, i18n]);

  const updateTemperatureUnit = useCallback(async (temperatureUnit: TemperatureUnit) => {
    const newPrefs = { ...preferences, temperatureUnit };
    setPreferences(newPrefs);
    saveToStorage(newPrefs);
    if (user) {
      await saveToSupabase(user.id, { temperatureUnit });
    }
  }, [preferences, user, saveToStorage, saveToSupabase]);

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        loading,
        updateCurrency,
        updateLanguage,
        updateTemperatureUnit,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};
