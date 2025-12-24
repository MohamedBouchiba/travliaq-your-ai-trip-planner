import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, MessageSquare, Trash2, X, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
}

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatHistorySidebar = ({
  sessions,
  activeSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: ChatHistorySidebarProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteSession(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "absolute top-0 left-0 h-full w-72 bg-card border-r border-border z-50 shadow-xl",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Historique</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "font-medium text-sm"
            )}
          >
            <Plus className="h-4 w-4" />
            Nouvelle conversation
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sortedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune conversation
            </div>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer",
                  "transition-all duration-200",
                  session.id === activeSessionId
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <MessageSquare
                  className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    session.id === activeSessionId
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {session.title}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {session.preview}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    {format(session.updatedAt, "d MMM, HH:mm", { locale: fr })}
                  </div>
                </div>

                {/* Delete button */}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className={cn(
                      "p-1.5 rounded-lg opacity-0 group-hover:opacity-100",
                      "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                      "transition-all duration-200"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La conversation sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
