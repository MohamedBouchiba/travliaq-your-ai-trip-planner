/**
 * Widget Cooldown Hook
 * Prevents infinite widget loops by tracking widget history and enforcing cooldowns
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { WidgetType } from '@/types/flight';

/**
 * Configuration constants
 */
const WIDGET_COOLDOWN_MS = 60000; // 1 minute cooldown before re-showing same widget
const MAX_WIDGET_ATTEMPTS = 2; // Max times to show same widget per session
const USER_TYPED_PENALTY_MS = 120000; // 2 min penalty if user typed instead of using widget

/**
 * Widget interaction record
 */
interface WidgetRecord {
  widgetType: WidgetType;
  shownAt: number;
  confirmed: boolean;
  dismissed: boolean;
  userTypedInstead: boolean;
  attempts: number;
}

/**
 * Cooldown state
 */
interface CooldownState {
  history: Map<WidgetType, WidgetRecord>;
  sessionStart: number;
}

/**
 * Hook return type
 */
export interface UseWidgetCooldownReturn {
  /** Check if a widget can be shown */
  canShowWidget: (widgetType: WidgetType) => boolean;
  
  /** Get reason why widget is blocked */
  getBlockReason: (widgetType: WidgetType) => string | null;
  
  /** Record that a widget was shown */
  recordWidgetShown: (widgetType: WidgetType) => void;
  
  /** Record that user confirmed/completed a widget */
  recordWidgetConfirmed: (widgetType: WidgetType) => void;
  
  /** Record that user dismissed a widget */
  recordWidgetDismissed: (widgetType: WidgetType) => void;
  
  /** Record that user typed a response instead of using widget */
  recordUserTypedInstead: (widgetType: WidgetType) => void;
  
  /** Get list of blocked widgets (for LLM context) */
  getBlockedWidgets: () => string[];
  
  /** Get cooldown info for LLM */
  getCooldownContextForLLM: () => string;
  
  /** Reset all cooldowns (new session) */
  resetCooldowns: () => void;
  
  /** Get widget attempt count */
  getAttemptCount: (widgetType: WidgetType) => number;
}

/**
 * Widget cooldown hook to prevent infinite widget loops
 */
export function useWidgetCooldown(): UseWidgetCooldownReturn {
  const [state, setState] = useState<CooldownState>({
    history: new Map(),
    sessionStart: Date.now(),
  });
  
  // Ref to track last shown widget for "user typed instead" detection
  const lastShownWidgetRef = useRef<{ type: WidgetType; timestamp: number } | null>(null);

  /**
   * Check if a widget can be shown
   */
  const canShowWidget = useCallback((widgetType: WidgetType): boolean => {
    const record = state.history.get(widgetType);
    
    if (!record) {
      return true; // Never shown before
    }
    
    const now = Date.now();
    
    // Rule 1: Already confirmed = don't show again for this data
    if (record.confirmed) {
      return false;
    }
    
    // Rule 2: Max attempts reached
    if (record.attempts >= MAX_WIDGET_ATTEMPTS) {
      return false;
    }
    
    // Rule 3: User typed instead = longer cooldown
    if (record.userTypedInstead) {
      const timeSinceShow = now - record.shownAt;
      if (timeSinceShow < USER_TYPED_PENALTY_MS) {
        return false;
      }
    }
    
    // Rule 4: Standard cooldown
    const timeSinceShow = now - record.shownAt;
    if (timeSinceShow < WIDGET_COOLDOWN_MS) {
      return false;
    }
    
    return true;
  }, [state.history]);

  /**
   * Get reason why widget is blocked
   */
  const getBlockReason = useCallback((widgetType: WidgetType): string | null => {
    const record = state.history.get(widgetType);
    
    if (!record) {
      return null;
    }
    
    const now = Date.now();
    
    if (record.confirmed) {
      return 'already_confirmed';
    }
    
    if (record.attempts >= MAX_WIDGET_ATTEMPTS) {
      return 'max_attempts';
    }
    
    if (record.userTypedInstead) {
      const timeSinceShow = now - record.shownAt;
      if (timeSinceShow < USER_TYPED_PENALTY_MS) {
        return 'user_prefers_typing';
      }
    }
    
    const timeSinceShow = now - record.shownAt;
    if (timeSinceShow < WIDGET_COOLDOWN_MS) {
      return 'cooldown';
    }
    
    return null;
  }, [state.history]);

  /**
   * Record that a widget was shown
   */
  const recordWidgetShown = useCallback((widgetType: WidgetType) => {
    const now = Date.now();
    lastShownWidgetRef.current = { type: widgetType, timestamp: now };
    
    setState((prev) => {
      const newHistory = new Map(prev.history);
      const existing = newHistory.get(widgetType);
      
      newHistory.set(widgetType, {
        widgetType,
        shownAt: now,
        confirmed: false,
        dismissed: existing?.dismissed || false,
        userTypedInstead: false,
        attempts: (existing?.attempts || 0) + 1,
      });
      
      return { ...prev, history: newHistory };
    });
    
    if (import.meta.env.DEV) console.log('[WidgetCooldown] Recorded show:', widgetType);
  }, []);

  /**
   * Record that user confirmed/completed a widget
   */
  const recordWidgetConfirmed = useCallback((widgetType: WidgetType) => {
    setState((prev) => {
      const newHistory = new Map(prev.history);
      const existing = newHistory.get(widgetType);
      
      if (existing) {
        newHistory.set(widgetType, {
          ...existing,
          confirmed: true,
        });
      }
      
      return { ...prev, history: newHistory };
    });
    
    if (import.meta.env.DEV) console.log('[WidgetCooldown] Widget confirmed:', widgetType);
  }, []);

  /**
   * Record that user dismissed a widget
   */
  const recordWidgetDismissed = useCallback((widgetType: WidgetType) => {
    setState((prev) => {
      const newHistory = new Map(prev.history);
      const existing = newHistory.get(widgetType);
      
      if (existing) {
        newHistory.set(widgetType, {
          ...existing,
          dismissed: true,
        });
      }
      
      return { ...prev, history: newHistory };
    });
    
    if (import.meta.env.DEV) console.log('[WidgetCooldown] Widget dismissed:', widgetType);
  }, []);

  /**
   * Record that user typed instead of using the last shown widget
   */
  const recordUserTypedInstead = useCallback((widgetType: WidgetType) => {
    const lastShown = lastShownWidgetRef.current;
    
    // Only apply if the widget was shown recently (within 30 seconds)
    if (lastShown && lastShown.type === widgetType) {
      const timeSinceShow = Date.now() - lastShown.timestamp;
      if (timeSinceShow < 30000) {
        setState((prev) => {
          const newHistory = new Map(prev.history);
          const existing = newHistory.get(widgetType);
          
          if (existing) {
            newHistory.set(widgetType, {
              ...existing,
              userTypedInstead: true,
            });
          }
          
          return { ...prev, history: newHistory };
        });
        
        if (import.meta.env.DEV) console.log('[WidgetCooldown] User typed instead of using:', widgetType);
      }
    }
  }, []);

  /**
   * Get list of blocked widgets for LLM context
   */
  const getBlockedWidgets = useCallback((): string[] => {
    const blocked: string[] = [];
    const now = Date.now();
    
    state.history.forEach((record, widgetType) => {
      if (!canShowWidget(widgetType)) {
        blocked.push(widgetType);
      }
    });
    
    return blocked;
  }, [state.history, canShowWidget]);

  /**
   * Get cooldown context for LLM
   */
  const getCooldownContextForLLM = useCallback((): string => {
    const blocked = getBlockedWidgets();
    
    if (blocked.length === 0) {
      return '';
    }
    
    const reasons: string[] = [];
    blocked.forEach((widgetType) => {
      const reason = getBlockReason(widgetType as WidgetType);
      if (reason === 'already_confirmed') {
        reasons.push(`${widgetType} (déjà confirmé)`);
      } else if (reason === 'max_attempts') {
        reasons.push(`${widgetType} (limite atteinte)`);
      } else if (reason === 'user_prefers_typing') {
        reasons.push(`${widgetType} (utilisateur préfère taper)`);
      } else if (reason === 'cooldown') {
        reasons.push(`${widgetType} (cooldown)`);
      }
    });
    
    return `[WIDGETS BLOQUÉS - NE PAS RE-PROPOSER]\n${reasons.join(', ')}`;
  }, [getBlockedWidgets, getBlockReason]);

  /**
   * Reset all cooldowns (for new session)
   */
  const resetCooldowns = useCallback(() => {
    setState({
      history: new Map(),
      sessionStart: Date.now(),
    });
    lastShownWidgetRef.current = null;
    if (import.meta.env.DEV) console.log('[WidgetCooldown] Reset cooldowns');
  }, []);

  /**
   * Get widget attempt count
   */
  const getAttemptCount = useCallback((widgetType: WidgetType): number => {
    return state.history.get(widgetType)?.attempts || 0;
  }, [state.history]);

  return {
    canShowWidget,
    getBlockReason,
    recordWidgetShown,
    recordWidgetConfirmed,
    recordWidgetDismissed,
    recordUserTypedInstead,
    getBlockedWidgets,
    getCooldownContextForLLM,
    resetCooldowns,
    getAttemptCount,
  };
}
