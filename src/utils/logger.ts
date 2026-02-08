/**
 * Logger professionnel pour Travliaq avec intégration Sentry
 * 
 * Ce module fournit des fonctions de logging structuré avec :
 * - Niveaux de log (debug, info, warn, error)
 * - Breadcrumbs automatiques pour tracer le parcours utilisateur
 * - Contexte enrichi pour le débogage
 * - Protection des données sensibles
 */

import * as Sentry from "@sentry/react";

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogCategory {
  QUESTIONNAIRE = 'questionnaire',
  AUTH = 'authentication',
  API = 'api',
  NAVIGATION = 'navigation',
  VALIDATION = 'validation',
  SUBMISSION = 'submission',
  PERFORMANCE = 'performance',
  PLANNER_CHAT = 'planner_chat',
  PLANNER_TOOL = 'planner_tool'
}

interface LogContext {
  category?: LogCategory;
  step?: number;
  totalSteps?: number;
  answers?: Record<string, any>;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Nettoie les données sensibles avant l'envoi à Sentry
 * Protection contre les références circulaires
 */
function sanitizeData(data: any, seen = new WeakSet()): any {
  // Gérer les valeurs primitives et null/undefined
  if (!data || typeof data !== 'object') return data;
  
  // Détecter les références circulaires
  if (seen.has(data)) {
    return '[Circular Reference]';
  }
  
  // Marquer cet objet comme visité
  seen.add(data);
  
  // Gérer les tableaux
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, seen));
  }
  
  const sensitiveFields = ['email', 'password', 'token', 'creditCard', 'ssn', 'phone'];
  const sanitized: Record<string, any> = {};
  
  try {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = sanitizeData(data[key], seen);
        } else {
          sanitized[key] = data[key];
        }
      }
    }
  } catch (error) {
    return '[Sanitization Error]';
  }
  
  return sanitized;
}

/**
 * Logger principal - Envoie les logs à Sentry avec contexte enrichi
 */
export const logger = {
  /**
   * Log de niveau DEBUG (développement uniquement)
   */
  debug(message: string, context?: LogContext) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, context);
    }
    
    Sentry.addBreadcrumb({
      category: context?.category || 'general',
      message,
      level: 'debug',
      data: sanitizeData(context?.metadata)
    });
  },

  /**
   * Log de niveau INFO (événements normaux)
   */
  info(message: string, context?: LogContext) {
    console.info(`[INFO] ${message}`);
    
    Sentry.addBreadcrumb({
      category: context?.category || 'general',
      message,
      level: 'info',
      data: sanitizeData(context?.metadata)
    });

    // Ajouter le contexte à Sentry
    if (context?.step && context?.totalSteps) {
      Sentry.setContext('questionnaire', {
        currentStep: context.step,
        totalSteps: context.totalSteps,
        progress: `${Math.round((context.step / context.totalSteps) * 100)}%`
      });
    }
  },

  /**
   * Log de niveau WARNING (situations anormales non critiques)
   */
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context);
    
    Sentry.addBreadcrumb({
      category: context?.category || 'general',
      message,
      level: 'warning',
      data: sanitizeData(context?.metadata)
    });

    // Capturer comme événement Sentry
    Sentry.captureMessage(message, {
      level: 'warning',
      contexts: {
        custom: sanitizeData(context)
      }
    });
  },

  /**
   * Log de niveau ERROR (erreurs nécessitant attention)
   */
  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}`, context);
    
    const error = context?.error || new Error(message);
    
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        category: context?.category || 'unknown',
        step: context?.step?.toString() || 'unknown'
      },
      contexts: {
        questionnaire: context?.step && context?.totalSteps ? {
          currentStep: context.step,
          totalSteps: context.totalSteps,
          answers: sanitizeData(context.answers)
        } : undefined,
        custom: sanitizeData(context?.metadata)
      }
    });
  },

  /**
   * Log de niveau FATAL (erreurs critiques)
   */
  fatal(message: string, context?: LogContext) {
    console.error(`[FATAL] ${message}`, context);
    
    const error = context?.error || new Error(message);
    
    Sentry.captureException(error, {
      level: 'fatal',
      tags: {
        category: context?.category || 'unknown',
        critical: 'true'
      },
      contexts: {
        questionnaire: context?.step && context?.totalSteps ? {
          currentStep: context.step,
          totalSteps: context.totalSteps
        } : undefined,
        custom: sanitizeData(context?.metadata)
      }
    });
  }
};

/**
 * Helpers spécifiques au questionnaire
 */
export const questionnaireLogger = {
  /**
   * Log l'avancement dans le questionnaire
   */
  logStepChange(step: number, totalSteps: number, stepName?: string) {
    logger.info(`Questionnaire - Étape ${step}/${totalSteps}${stepName ? `: ${stepName}` : ''}`, {
      category: LogCategory.QUESTIONNAIRE,
      step,
      totalSteps,
      metadata: { stepName }
    });
  },

  /**
   * Log une validation échouée
   */
  logValidationError(step: number, field: string, reason: string) {
    logger.warn(`Validation échouée - Étape ${step}`, {
      category: LogCategory.VALIDATION,
      step,
      metadata: { field, reason }
    });
  },

  /**
   * Log une réponse utilisateur
   */
  logAnswer(step: number, field: string, value: any) {
    logger.debug(`Réponse - ${field}`, {
      category: LogCategory.QUESTIONNAIRE,
      step,
      metadata: { 
        field, 
        value: typeof value === 'object' ? JSON.stringify(value) : value 
      }
    });
  },

  /**
   * Log une soumission de questionnaire
   */
  logSubmission(success: boolean, responseId?: string, error?: Error) {
    if (success) {
      logger.info('Questionnaire soumis avec succès', {
        category: LogCategory.SUBMISSION,
        metadata: { responseId }
      });
    } else {
      logger.error('Échec de soumission du questionnaire', {
        category: LogCategory.SUBMISSION,
        error,
        metadata: { responseId }
      });
    }
  },

  /**
   * Log une incohérence détectée
   */
  logInconsistency(issue: string, details: Record<string, any>) {
    logger.error(`Incohérence détectée: ${issue}`, {
      category: LogCategory.QUESTIONNAIRE,
      metadata: details
    });
  },

  /**
   * Log les performances (temps de chargement, etc.)
   */
  logPerformance(metric: string, duration: number) {
    logger.debug(`Performance - ${metric}: ${duration}ms`, {
      category: LogCategory.PERFORMANCE,
      metadata: { metric, duration }
    });
  }
};

/**
 * Planner Chat Logger - Specialized logging for the travel planner chat
 * Traces requests from frontend to backend with request IDs
 */
export const plannerLogger = {
  /**
   * Log the start of a chat request
   */
  logRequest(requestId: string, message: string, metadata?: Record<string, any>) {
    logger.info(`[${requestId}] ${message}`, {
      category: LogCategory.PLANNER_CHAT,
      metadata: { request_id: requestId, ...metadata }
    });
  },

  /**
   * Log tool execution events (started, finished, failed)
   */
  logToolEvent(
    requestId: string, 
    tool: string, 
    status: 'started' | 'finished' | 'failed', 
    metadata?: Record<string, any>
  ) {
    const level = status === 'failed' ? 'warn' : 'info';
    const message = `[${requestId}] Tool ${tool} ${status}`;
    
    if (level === 'warn') {
      logger.warn(message, {
        category: LogCategory.PLANNER_TOOL,
        metadata: { request_id: requestId, tool, status, ...metadata }
      });
    } else {
      logger.info(message, {
        category: LogCategory.PLANNER_TOOL,
        metadata: { request_id: requestId, tool, status, ...metadata }
      });
    }

    // Also add a breadcrumb for the tool event
    Sentry.addBreadcrumb({
      type: 'info',
      category: 'planner.tool',
      message: `Tool ${tool} ${status}`,
      level: status === 'failed' ? 'warning' : 'info',
      data: sanitizeData({ request_id: requestId, tool, status, ...metadata })
    });
  },

  /**
   * Log SSE events received from backend
   */
  logSSEEvent(requestId: string, eventType: string, data?: Record<string, any>) {
    logger.debug(`[${requestId}] SSE event: ${eventType}`, {
      category: LogCategory.PLANNER_CHAT,
      metadata: { request_id: requestId, event_type: eventType, ...sanitizeData(data) }
    });
  },

  /**
   * Log errors with full context
   */
  logError(requestId: string, error: Error, context?: Record<string, any>) {
    logger.error(`[${requestId}] Error: ${error.message}`, {
      category: LogCategory.PLANNER_CHAT,
      error,
      metadata: { request_id: requestId, ...context }
    });
  },

  /**
   * Log request completion with timing
   */
  logRequestComplete(requestId: string, durationMs: number, metadata?: Record<string, any>) {
    logger.info(`[${requestId}] Request completed in ${durationMs}ms`, {
      category: LogCategory.PLANNER_CHAT,
      metadata: { request_id: requestId, duration_ms: durationMs, ...metadata }
    });

    // Add performance span
    Sentry.addBreadcrumb({
      type: 'info',
      category: 'planner.performance',
      message: `Request ${requestId} completed`,
      level: 'info',
      data: { request_id: requestId, duration_ms: durationMs, ...sanitizeData(metadata) }
    });
  },

  /**
   * Set request context in Sentry for correlation
   */
  setRequestContext(requestId: string, phase?: string, language?: string) {
    Sentry.setContext('planner_request', {
      request_id: requestId,
      phase,
      language,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Helper pour tracer les actions utilisateur importantes
 */
export function trackUserAction(action: string, category: LogCategory, metadata?: Record<string, any>) {
  Sentry.addBreadcrumb({
    type: 'user',
    category,
    message: action,
    level: 'info',
    data: sanitizeData(metadata)
  });
}

/**
 * Helper pour définir l'utilisateur dans Sentry
 */
export function setUser(userId?: string, email?: string, properties?: Record<string, any>) {
  Sentry.setUser(
    userId ? {
      id: userId,
      email: email ? '[REDACTED]' : undefined, // Ne pas envoyer l'email complet
      ...sanitizeData(properties)
    } : null
  );
}

/**
 * Helper pour capturer les événements personnalisés
 */
export function captureEvent(eventName: string, data?: Record<string, any>) {
  Sentry.captureMessage(eventName, {
    level: 'info',
    contexts: {
      event: sanitizeData(data)
    }
  });
}

/**
 * Initialise une transaction de performance (simplifié)
 */
export function startPerformanceTrace(name: string) {
  const startTime = Date.now();
  
  return {
    finish: () => {
      const duration = Date.now() - startTime;
      logger.debug(`Performance trace: ${name} completed in ${duration}ms`, {
        category: LogCategory.PERFORMANCE,
        metadata: { traceName: name, duration }
      });
    }
  };
}

export default logger;
