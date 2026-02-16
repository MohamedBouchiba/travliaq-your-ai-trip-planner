/**
 * ChatHeader - Top bar of the PlannerChat panel.
 *
 * Extracted from PlannerChat.tsx (A1) to keep the parent focused on orchestration.
 */

import { memo } from "react";
import { History, PanelLeftClose } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-travliaq.png";
import type { ChatSession } from "@/hooks/useChatSessions";

interface ChatHeaderProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onHistoryOpen: () => void;
  onToggleCollapse?: () => void;
}

export const ChatHeader = memo(function ChatHeader({
  sessions,
  activeSessionId,
  onHistoryOpen,
  onToggleCollapse,
}: ChatHeaderProps) {
  const { t } = useTranslation();

  const rawTitle =
    sessions.find((s) => s.id === activeSessionId)?.title ||
    t("planner.chat.newConversation");
  const titleWithoutEmoji = rawTitle.replace(/^\p{Extended_Pictographic}\s*/u, "");
  const defaultTitles = ["Nouvelle conversation", "New conversation"];
  const displayTitle = defaultTitles.includes(titleWithoutEmoji)
    ? t("planner.chat.newConversation")
    : titleWithoutEmoji;

  return (
    <div className="flex items-center justify-between h-12 px-3 border-b border-border shrink-0 bg-background animate-fade-in">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain shrink-0" />
        <span className="font-medium text-foreground text-sm truncate max-w-[240px]">
          {displayTitle}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onHistoryOpen}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={t("planner.chat.history")}
          aria-label={t("planner.chat.history")}
        >
          <History className="h-4 w-4" />
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t("planner.chat.closeChat")}
            aria-label={t("planner.chat.closeChat")}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});
