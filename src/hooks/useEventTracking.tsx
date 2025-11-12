import { useCallback } from 'react';
import { logger, LogCategory, trackUserAction } from '@/utils/logger';

interface EventParams {
  [key: string]: any;
}

export const useEventTracking = () => {
  const trackEvent = useCallback((eventName: string, category: LogCategory, params?: EventParams) => {
    trackUserAction(eventName, category, params);
    
    // Log en développement
    if (import.meta.env.DEV) {
      console.log('📊 Event tracked:', eventName, params);
    }
  }, []);

  // Événements prédéfinis
  const trackFormSubmit = useCallback((formName: string, params?: EventParams) => {
    logger.info(`Formulaire soumis: ${formName}`, {
      category: LogCategory.QUESTIONNAIRE,
      metadata: { formName, ...params }
    });
  }, []);

  const trackButtonClick = useCallback((buttonName: string, params?: EventParams) => {
    trackUserAction(`Clic bouton: ${buttonName}`, LogCategory.NAVIGATION, params);
  }, []);

  const trackSearch = useCallback((searchTerm: string, params?: EventParams) => {
    trackUserAction('Recherche', LogCategory.NAVIGATION, { searchTerm, ...params });
  }, []);

  return {
    trackEvent,
    trackFormSubmit,
    trackButtonClick,
    trackSearch
  };
};
