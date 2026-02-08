import { useState, useRef } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Plus, MessageSquare, Trash2, X, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/hooks/useLocale";
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
  onDeleteAllSessions?: () => void;
}

export const ChatHistorySidebar = ({
  sessions,
  activeSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onDeleteAllSessions,
}: ChatHistorySidebarProps) => {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper to normalize session titles/previews - always show current locale translation for default values
  const DEFAULT_TITLES = ["Nouvelle conversation", "New conversation", "✈️ Nouvelle conversation", "✈️ New conversation"];
  const DEFAULT_PREVIEWS = ["Démarrez la conversation...", "Start the conversation..."];
  
  const normalizeTitle = (title: string): string => {
    const titleWithoutEmoji = title.replace(/^\p{Extended_Pictographic}\s*/u, "");
    if (DEFAULT_TITLES.some(def => def.replace(/^\p{Extended_Pictographic}\s*/u, "") === titleWithoutEmoji)) {
      return t("planner.chat.newConversation");
    }
    return title;
  };
  
  const normalizePreview = (preview: string): string => {
    if (DEFAULT_PREVIEWS.includes(preview)) {
      return t("planner.chat.startConversation");
    }
    return preview;
  };
  const [showNewSessionConfirm, setShowNewSessionConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  // Loading states for buttons
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Debounce guard
  const actionLockRef = useRef(false);

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    // Close dialog + sidebar first (prevents UI race conditions)
    const sessionToDelete = deleteConfirmId;
    setDeleteConfirmId(null);
    onClose();

    // Let close animations commit
    await new Promise((resolve) => setTimeout(resolve, 150));

    onDeleteSession(sessionToDelete);
  };

  const handleNewSession = async () => {
    // Prevent double-clicks
    if (actionLockRef.current || isCreatingSession) return;
    actionLockRef.current = true;
    
    setShowNewSessionConfirm(false);
    setIsCreatingSession(true);
    
    // Show toast
    toast.loading(t("planner.chat.creatingToast"), { id: "new-session" });
    
    onClose();
    
    // Small delay to let sidebar close
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    onNewSession();
    
    // Wait for reset to settle
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    setIsCreatingSession(false);
    toast.success(t("planner.chat.createdToast"), { id: "new-session" });
    
    // Release lock after additional delay
    setTimeout(() => {
      actionLockRef.current = false;
    }, 200);
  };

  const confirmDeleteAll = async () => {
    // Prevent double-clicks
    if (actionLockRef.current || isDeletingAll) return;
    actionLockRef.current = true;
    
    setShowDeleteAllConfirm(false);
    setIsDeletingAll(true);
    
    // Show toast
    toast.loading(t("planner.chat.deletingToast"), { id: "delete-all" });
    
    onClose();
    
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    onDeleteAllSessions?.();
    
    // Wait for reset to settle
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    setIsDeletingAll(false);
    toast.success(t("planner.chat.deletedToast"), { id: "delete-all" });
    
    // Release lock after additional delay
    setTimeout(() => {
      actionLockRef.current = false;
    }, 200);
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
            <h2 className="font-semibold text-foreground">{t("planner.chat.history")}</h2>
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
            onClick={() => setShowNewSessionConfirm(true)}
            disabled={isCreatingSession || isDeletingAll}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "font-medium text-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCreatingSession ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isCreatingSession ? t("planner.chat.creating") : t("planner.chat.newConversation")}
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sortedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("planner.chat.noConversation")}
            </div>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  if (!isCreatingSession && !isDeletingAll) {
                    onSelectSession(session.id);
                    onClose();
                  }
                }}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer",
                  "transition-all duration-200",
                  session.id === activeSessionId
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent",
                  (isCreatingSession || isDeletingAll) && "opacity-50 pointer-events-none"
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
                    {normalizeTitle(session.title)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {normalizePreview(session.preview)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    {format(session.updatedAt, "d MMM, HH:mm", { locale: dateFnsLocale })}
                  </div>
                </div>

                {/* Delete button */}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    disabled={isCreatingSession || isDeletingAll}
                    className={cn(
                      "p-1.5 rounded-lg opacity-0 group-hover:opacity-100",
                      "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                      "transition-all duration-200",
                      "disabled:opacity-0"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Delete All Button */}
        {sessions.length > 0 && onDeleteAllSessions && (
          <div className="p-3 border-t border-border">
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={isCreatingSession || isDeletingAll}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
                "text-destructive border border-destructive/30",
                "hover:bg-destructive/10 transition-colors",
                "text-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isDeletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeletingAll ? t("planner.chat.deleting") : t("planner.chat.deleteAll")}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => {
        if (!open) setDeleteConfirmId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("planner.dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("planner.dialog.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("planner.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("planner.dialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Session Confirmation Dialog */}
      <AlertDialog open={showNewSessionConfirm} onOpenChange={setShowNewSessionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("planner.dialog.newTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("planner.dialog.newDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingSession}>{t("planner.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleNewSession}
              disabled={isCreatingSession}
            >
              {isCreatingSession ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("planner.chat.creating")}
                </>
              ) : (
                t("planner.dialog.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("planner.dialog.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("planner.dialog.deleteAllDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>{t("planner.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={isDeletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("planner.chat.deleting")}
                </>
              ) : (
                t("planner.chat.deleteAll")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
