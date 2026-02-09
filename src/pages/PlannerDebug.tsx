/**
 * PlannerDebug - Developer debug page for the travel planner chat
 * 
 * Only accessible in development mode.
 * Shows the chat alongside a debug panel with:
 * - Intent classification
 * - Tool executions
 * - Flow state
 * - Memory context
 * - Raw API response
 */

import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Lazy load the debug panel only
const DebugPanel = lazy(() => import("@/components/planner/debug/DebugPanel"));

// Import TravelPlanner directly since we need it inline
import TravelPlanner from "./TravelPlanner";

export default function PlannerDebug() {
  // Only allow access in development mode
  if (import.meta.env.PROD) {
    return <Navigate to="/planner" replace />;
  }

  return (
    <div className="h-screen w-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Planner Area */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <TravelPlanner />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Debug Panel */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
            <DebugPanel />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
