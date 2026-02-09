/**
 * Zod validation schemas for tool outputs
 * 
 * Provides type-safe validation for all tool outputs with structured error handling
 * to prevent malformed data from reaching the frontend state stores.
 */

import { z } from "npm:zod";

// ============================================================================
// FLIGHT DATA SCHEMA
// ============================================================================
export const FlightDataSchema = z.object({
  // Destination
  to: z.string().max(100).optional(),
  toCountryCode: z.string().length(2).toUpperCase().optional(),
  toCountryName: z.string().max(100).optional(),
  
  // Origin
  from: z.string().max(100).optional(),
  fromCountryCode: z.string().length(2).toUpperCase().optional(),
  fromCountryName: z.string().max(100).optional(),
  
  // Dates
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional(),
  tripDuration: z.string().max(50).optional(),
  preferredMonth: z.string().max(50).optional(),
  
  // Travelers
  adults: z.number().min(1).max(9).optional(),
  children: z.number().min(0).max(9).optional(),
  infants: z.number().min(0).max(9).optional(),
  
  // Widget triggers
  needsDateWidget: z.boolean().optional(),
  needsTravelersWidget: z.boolean().optional(),
  needsCitySelection: z.boolean().optional(),
  
  // Trip details
  tripType: z.enum(["roundtrip", "oneway", "multi"]).optional(),
  budgetHint: z.string().max(100).optional(),
  
  // Multi-destination legs
  legs: z.array(z.object({
    from: z.string().max(100),
    to: z.string().max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional(),
  })).optional(),
}).strict();

export type FlightData = z.infer<typeof FlightDataSchema>;

// ============================================================================
// ACCOMMODATION DATA SCHEMA
// ============================================================================
export const AccommodationDataSchema = z.object({
  budgetPreset: z.enum(["eco", "comfort", "premium"]).optional(),
  priceMin: z.number().min(0).max(10000).optional(),
  priceMax: z.number().min(0).max(10000).optional(),
  types: z.array(z.enum(["hotel", "apartment", "villa", "hostel", "guesthouse"])).optional(),
  minRating: z.number().min(1).max(10).optional(),
  amenities: z.array(z.enum(["wifi", "parking", "breakfast", "ac", "pool", "kitchen"])).optional(),
  mealPlan: z.enum(["breakfast", "half", "full", "all-inclusive"]).optional(),
  needsAccommodationWidget: z.boolean().optional(),
}).strict();

export type AccommodationData = z.infer<typeof AccommodationDataSchema>;

// ============================================================================
// PREFERENCES DATA SCHEMA
// ============================================================================
// Helper: coerce LLM "true"/"false" strings to booleans
const coerceBool = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  },
  z.boolean().optional()
);

export const PreferencesDataSchema = z.object({
  travelStyle: z.enum(["solo", "couple", "family", "friends"]).optional(),
  pace: z.enum(["relaxed", "moderate", "intense"]).optional(),
  chillVsIntense: z.number().min(0).max(100).optional(),
  cityVsNature: z.number().min(0).max(100).optional(),
  ecoVsLuxury: z.number().min(0).max(100).optional(),
  touristVsLocal: z.number().min(0).max(100).optional(),
  interests: z.array(z.string().max(50)).optional(),
  occasion: z.enum(["honeymoon", "anniversary", "birthday", "vacation", "workation"]).optional(),
  needsWifi: coerceBool,
  petFriendly: coerceBool,
  accessibilityRequired: coerceBool,
  familyFriendly: coerceBool,
  dietaryRestrictions: z.array(z.string().max(50)).optional(),
}).passthrough();

export type PreferencesData = z.infer<typeof PreferencesDataSchema>;

// ============================================================================
// QUICK REPLIES SCHEMA
// ============================================================================
const QuickReplyItemSchema = z.object({
  label: z.string().max(30),
  emoji: z.string().max(10),
  message: z.string().max(200),
});

export const QuickRepliesDataSchema = z.object({
  replies: z.array(QuickReplyItemSchema).max(4),
  reasoning: z.string().max(500).optional(),
});

export type QuickRepliesData = z.infer<typeof QuickRepliesDataSchema>;

// ============================================================================
// DESTINATION SUGGESTION REQUEST SCHEMA
// ============================================================================
export const DestinationSuggestionRequestSchema = z.object({
  requestedCount: z.number().min(1).max(5),
  reason: z.string().max(200).optional(),
  exceededLimit: z.boolean().optional(),
});

export type DestinationSuggestionRequest = z.infer<typeof DestinationSuggestionRequestSchema>;

// ============================================================================
// FLIGHT SEARCH TRIGGER SCHEMA
// ============================================================================
export const FlightSearchTriggerSchema = z.object({
  confirmed: z.boolean(),
  message: z.string().max(200).optional(),
});

export type FlightSearchTrigger = z.infer<typeof FlightSearchTriggerSchema>;

// ============================================================================
// INTENT CLASSIFICATION SCHEMA (for validation)
// ============================================================================
export const WidgetToShowSchema = z.object({
  type: z.string().max(50),
  reason: z.string().max(200),
  data: z.record(z.unknown()).optional(),
});

export const IntentClassificationSchema = z.object({
  primaryIntent: z.string().max(50),
  confidence: z.number().min(0).max(100),
  entities: z.record(z.unknown()),
  widgetToShow: WidgetToShowSchema.optional(),
  nextExpectedIntent: z.string().max(50).optional(),
  requiresClarification: z.boolean().optional(),
  clarificationQuestion: z.string().max(500).optional(),
});

export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

// ============================================================================
// TOOL RESULT WRAPPER (for structured error handling)
// ============================================================================
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
    issues?: z.ZodIssue[];
  };
}

/**
 * Validate and parse tool output with structured error handling
 */
export function validateToolOutput<T>(
  schema: z.ZodSchema<T>,
  rawData: string | unknown,
  toolName: string
): ToolResult<T> {
  try {
    // Parse JSON if string
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const issues = result.error.issues;
      const fieldErrors = issues.map(i => i.path.join(".")).join(", ");
      
      return {
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: `Invalid ${toolName} output: ${fieldErrors}`,
          suggestion: getSuggestionForErrors(issues, toolName),
          issues,
        },
      };
    }
    
    return {
      success: true,
      data: result.data,
    };
  } catch (e) {
    return {
      success: false,
      error: {
        code: "PARSE_ERROR",
        message: `Failed to parse ${toolName} output: ${e instanceof Error ? e.message : "Unknown error"}`,
        suggestion: "Ensure the output is valid JSON",
      },
    };
  }
}

/**
 * Generate helpful suggestions based on validation errors
 */
function getSuggestionForErrors(issues: z.ZodIssue[], toolName: string): string {
  const suggestions: string[] = [];
  
  for (const issue of issues) {
    const field = issue.path.join(".");
    
    if (issue.code === "invalid_type") {
      suggestions.push(`Field "${field}" should be ${issue.expected}, got ${issue.received}`);
    } else if (issue.code === "too_small") {
      suggestions.push(`Field "${field}" is too short or small`);
    } else if (issue.code === "too_big") {
      suggestions.push(`Field "${field}" exceeds maximum allowed value`);
    } else if (issue.code === "invalid_string") {
      if (issue.validation === "regex") {
        if (field.includes("Date")) {
          suggestions.push(`Field "${field}" must be in YYYY-MM-DD format`);
        }
      }
    } else if (issue.code === "invalid_enum_value") {
      suggestions.push(`Field "${field}" must be one of: ${(issue as any).options?.join(", ")}`);
    }
  }
  
  return suggestions.length > 0 
    ? suggestions.slice(0, 3).join(". ") 
    : `Please check the ${toolName} output format`;
}

// ============================================================================
// REQUEST INPUT VALIDATION
// ============================================================================
export const RequestInputSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(10000),
  })).max(50),
  stream: z.boolean().optional().default(true),
  currentStep: z.string().max(50).optional(),
  currentPhase: z.enum(["inspiration", "research", "comparison", "planning", "booking"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  negativePreferences: z.string().max(5000).optional(),
  widgetHistory: z.string().max(5000).optional(),
  activeWidgetsContext: z.string().max(2000).optional(),
  blockedWidgets: z.array(z.string().max(50)).max(20).optional(),
  requestId: z.string().uuid().optional(),
});

export type RequestInput = z.infer<typeof RequestInputSchema>;

/**
 * Validate incoming request
 */
export function validateRequest(body: unknown): ToolResult<RequestInput> {
  return validateToolOutput(RequestInputSchema, body, "request");
}
