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

// Thinking/Reasoning state management (Chain of Thought)
export {
  useThinkingState,
  type ThinkingState,
  type UseThinkingStateReturn,
} from "./useThinkingState";

// Widget flow management
export { useChatWidgetFlow, type UseChatWidgetFlowOptions, type WidgetFlowState } from "./useChatWidgetFlow";

// Imperative handlers
export {
  useChatImperativeHandlers,
  type UseChatImperativeHandlersOptions,
} from "./useChatImperativeHandlers";

// Workflow integration
export {
  useChatWorkflow,
  type UseChatWorkflowOptions,
  type UseChatWorkflowReturn,
} from "./useChatWorkflow";

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
