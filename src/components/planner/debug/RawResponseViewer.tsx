/**
 * RawResponseViewer - View raw API responses
 */

import { memo, useState } from "react";
import { FileJson, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RawResponse } from "@/stores/debugStore";

interface RawResponseViewerProps {
  responses: RawResponse[];
}

function RawResponseViewerComponent({ responses }: RawResponseViewerProps) {
  const [expandedResponses, setExpandedResponses] = useState<Set<number>>(new Set([0]));
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleResponse = (index: number) => {
    setExpandedResponses(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (responses.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No raw responses yet</p>
        <p className="text-xs mt-1">API responses will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Raw API Responses ({responses.length})
      </h4>

      <div className="space-y-2">
        {responses.map((response, index) => (
          <div key={response.timestamp} className="border border-border rounded-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
              <button
                onClick={() => toggleResponse(index)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expandedResponses.has(index) ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs font-mono truncate">{response.requestId.slice(0, 8)}...</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(response.timestamp).toLocaleTimeString()}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2), index)}
              >
                {copiedIndex === index ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Content */}
            {expandedResponses.has(index) && (
              <ScrollArea className="max-h-[300px]">
                <pre className="p-3 text-[10px] font-mono whitespace-pre-wrap break-all bg-muted/10">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </ScrollArea>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export const RawResponseViewer = memo(RawResponseViewerComponent);
