/**
 * Chat Hooks - Custom hooks for the chat system
 */

// Streaming and API
export {
  useChatStream,
  type APIMessage,
  type StreamResult,
  type MemoryContext,
  type StreamError,
  type StreamErrorType,
  type UseChatStreamOptions,
  type ReasoningData,
  type IntentClassification,
  type ToolStatusEvent,
  type OnToolStatusUpdate,
} from "./useChatStream";

// Widget flow management
export { useChatWidgetFlow, type UseChatWidgetFlowOptions, type WidgetFlowState } from "./useChatWidgetFlow";

// Imperative handlers
export {
  useChatImperativeHandlers,
  type UseChatImperativeHandlersOptions,
} from "./useChatImperativeHandlers";

// Widget tracking for LLM context
export { useWidgetTracking } from "./useWidgetTracking";

// Widget action executor for LLM "choose for me" functionality
export {
  useWidgetActionExecutor,
  type ChooseWidgetAction,
  type WidgetActionExecutorOptions,
} from "./useWidgetActionExecutor";

// Preference widget callbacks (Phase 2.1 optimization)
export { usePreferenceWidgetCallbacks } from "./usePreferenceWidgetCallbacks";

// Chat submit logic (extracted from PlannerChat.tsx)
export { useChatSubmit, type UseChatSubmitOptions } from "./useChatSubmit";

// Unified Entity Pipeline
export { persistExtractedEntities } from "./persistExtractedEntities";

// Intent Router Core - Pure testable functions
export {
  computeFlowState,
  computeUserBehavior,
  hasAlreadyProvided,
  validateWidget,
  getNextRequiredWidget,
  evaluatePhaseTransition,
  isConversationalIntent,
  isWidgetTriggeringIntent,
  isCriticalWidget,
  CONFIDENCE_THRESHOLDS,
  CRITICAL_WIDGETS,
  CONVERSATIONAL_INTENTS,
  WIDGET_TRIGGERING_INTENTS,
  WIDGET_PREREQUISITES,
  WIDGET_TO_INTERACTION_MAP,
} from "./intentRouterCore";

// Unified Intent Router (Phase 2 - replaces useIntentHandler + useIntentRouter)
export {
  useUnifiedIntentRouter,
  type UseUnifiedIntentRouterOptions,
  type UseUnifiedIntentRouterReturn,
  type FlowState,
  type WidgetValidation,
  type IntentProcessResult,
  type UserBehavior,
} from "./useUnifiedIntentRouter";

// Session Context for enriched LLM context (Phase 3)
export { useSessionContext } from "./useSessionContext";

// Widget Cooldown - prevents infinite widget loops
export { useWidgetCooldown, type UseWidgetCooldownReturn } from "./useWidgetCooldown";

// Performance optimization hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
  useStableCallback,
  useLazyInit,
  usePrevious,
  useUpdateEffect,
  useIsMounted,
  useRenderCount,
  useMemoCompare,
} from "./usePerformance";
