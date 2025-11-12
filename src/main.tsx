import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Build Sentry tunnel URL via Supabase Edge Functions (public)
const SENTRY_TUNNEL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/sentry-tunnel`;

Sentry.init({
  dsn: "https://1b9edfe2871f3976f2bb29233636e5c4@o4510257788616704.ingest.de.sentry.io/4510262563045456",
  tunnel: SENTRY_TUNNEL,
  
  // Intégrations avancées
  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: false,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // Breadcrumbs automatiques
    Sentry.breadcrumbsIntegration({
      console: true, // Log console.log, console.error, etc.
      dom: true, // Clics, inputs, etc.
      fetch: true, // Requêtes HTTP
      history: true, // Navigation
      xhr: true // XMLHttpRequest
    })
  ],
  
  // Performance Monitoring - activé pour le logging
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% en prod, 100% en dev
  
  // Session Replay - désactivé comme demandé  
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  // Configuration de l'échantillonnage des erreurs
  sampleRate: 1.0, // Capturer 100% des erreurs
  
  // Envoyer les données PII par défaut (IP, user-agent, etc.)
  sendDefaultPii: true,
  
  // Environnement
  environment: import.meta.env.MODE,
  
  // Release tracking (optionnel - pour suivre les versions)
  release: `travliaq@${import.meta.env.VITE_APP_VERSION || 'dev'}`,
  
  // Configuration des breadcrumbs
  maxBreadcrumbs: 100, // Nombre max de breadcrumbs à conserver
  
  // Filtrage des erreurs non pertinentes
  beforeSend(event, hint) {
    // Filtrer les erreurs de réseau temporaires
    const error = hint.originalException as Error;
    if (error?.message?.includes('NetworkError') || 
        error?.message?.includes('Failed to fetch')) {
      // Logger quand même mais avec niveau plus bas
      console.warn('Network error filtered from Sentry:', error);
      return null; // Ne pas envoyer à Sentry
    }
    
    // Enrichir l'événement avec contexte additionnel
    event.tags = {
      ...event.tags,
      browser: window.navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
    
    return event;
  },
  
  // Filtrer les breadcrumbs sensibles
  beforeBreadcrumb(breadcrumb) {
    // Ne pas logger les breadcrumbs avec des données sensibles
    if (breadcrumb.category === 'console' && 
        breadcrumb.message?.toLowerCase().includes('password')) {
      return null;
    }
    return breadcrumb;
  },
  
  // Ignorer certaines erreurs connues
  ignoreErrors: [
    // Erreurs de navigation
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Erreurs d'extensions navigateur
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Erreurs de script loading (ad blockers)
    'Loading chunk',
    'Failed to load'
  ],
  
  // Désactiver les avertissements dans la console en production
  debug: import.meta.env.DEV
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="flex min-h-screen items-center justify-center"><p>Une erreur est survenue. Veuillez rafraîchir la page.</p></div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
