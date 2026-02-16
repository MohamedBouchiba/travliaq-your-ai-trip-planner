/**
 * Chat Utils - Utility functions for the chat system
 */

export { parseAction } from "./parseAction";
export {
  flightDataToMemory,
  getMissingFieldLabel,
  formatMissingFieldsMessage,
  type FlightMemoryUpdate,
} from "./flightDataToMemory";

// Message helpers - ID generation, message update utilities
export { generateId, updateMessageById } from "./messageHelpers";

// Security utilities - XSS protection, sanitization
export {
  escapeHtml,
  escapeHtmlAttribute,
  escapeICalText,
  sanitizeFilename,
  encodeURIComponentSafe,
  base64UrlEncode,
  base64UrlDecode,
  stripHtmlTags,
  safeJsonParse,
  truncateSafe,
  generateNonce,
} from "./security";

// Validation utilities - Input validation, type guards
export {
  validateDate,
  safeParseDate,
  isValidDate,
  validateNumber,
  safeParseNumber,
  validatePositiveInt,
  validatePrice,
  validateString,
  validateEmail,
  validateArray,
  validateTravelers,
  validateDateRange,
  isDefined,
  isNonEmptyString,
  isPositiveNumber,
  assert,
  assertDefined,
  type ValidationResult,
  type TravelersInput,
} from "./validators";
