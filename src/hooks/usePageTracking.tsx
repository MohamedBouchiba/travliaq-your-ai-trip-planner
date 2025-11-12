import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logger, LogCategory } from '@/utils/logger';

export const usePageTracking = () => {
  const location = useLocation();
  const previousPath = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    
    // Ne pas tracker si c'est la même page
    if (previousPath.current === currentPath) {
      return;
    }

    // Logger la navigation
    logger.info(`Navigation vers ${currentPath}`, {
      category: LogCategory.NAVIGATION,
      metadata: {
        from: previousPath.current || 'direct',
        to: currentPath,
        pageTitle: document.title
      }
    });

    // Mettre à jour la référence du chemin précédent
    previousPath.current = currentPath;
  }, [location]);
};
