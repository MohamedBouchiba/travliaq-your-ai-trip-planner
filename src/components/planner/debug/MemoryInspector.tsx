/**
 * MemoryInspector - Inspect memory context sent to LLM
 */

import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MemoryContext } from "@/stores/debugStore";

interface MemoryInspectorProps {
  context: MemoryContext | null;
}

function MemoryInspectorComponent({ context }: MemoryInspectorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["flight", "blocked"]));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!context) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No memory context yet</p>
        <p className="text-xs mt-1">Memory will appear after sending a message</p>
      </div>
    );
  }

  const sections = [
    { id: "flight", label: "Flight Summary", content: context.flightSummary },
    { id: "activity", label: "Activity Context", content: context.activityContext },
    { id: "preference", label: "Preference Context", content: context.preferenceContext },
    { id: "widget", label: "Widget History", content: context.widgetHistory },
    { id: "blocked", label: "Blocked Widgets", content: context.blockedWidgets?.join(", ") },
    { id: "basket", label: "Trip Basket", content: context.basketSummary },
    { id: "conversation", label: "Conversation Summary", content: context.conversationSummary },
  ].filter(s => s.content);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Memory Context
      </h4>

      {/* Current Phase */}
      {context.currentPhase && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Phase:</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {context.currentPhase}
          </Badge>
        </div>
      )}

      {/* Missing Fields */}
      {context.missingFields && context.missingFields.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <span className="text-xs text-yellow-600 font-medium">Missing Fields:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {context.missingFields.map((field, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-600">
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-1">
        {sections.map(section => (
          <div key={section.id} className="border border-border rounded-md overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              {expandedSections.has(section.id) ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">{section.label}</span>
            </button>
            
            {expandedSections.has(section.id) && (
              <div className="px-3 py-2 bg-muted/30 border-t border-border">
                <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground">
                  {section.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Session Entities */}
      {context.sessionEntities && (
        <div className="mt-4 pt-3 border-t border-border">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Session Entities</h5>
          <div className="space-y-1 text-xs">
            {context.sessionEntities.destinations?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Destinations:</span>{" "}
                {context.sessionEntities.destinations.join(", ")}
              </div>
            )}
            {context.sessionEntities.dates?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Dates:</span>{" "}
                {context.sessionEntities.dates.join(", ")}
              </div>
            )}
            {context.sessionEntities.budgets?.length > 0 && (
              <div>
                <span className="text-muted-foreground">Budgets:</span>{" "}
                {context.sessionEntities.budgets.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const MemoryInspector = memo(MemoryInspectorComponent);
