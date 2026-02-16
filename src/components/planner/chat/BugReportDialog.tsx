/**
 * BugReportDialog - Optional comment dialog after bug report upload.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BugReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitComment: (comment: string) => void;
}

export function BugReportDialog({ isOpen, onClose, onSubmitComment }: BugReportDialogProps) {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setIsSending(true);
    await onSubmitComment(comment.trim());
    setIsSending(false);
    setComment("");
    onClose();
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("planner.chat.reportCommentTitle")}</DialogTitle>
          <DialogDescription>{t("planner.chat.reportCommentDescription")}</DialogDescription>
        </DialogHeader>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("planner.chat.reportCommentPlaceholder")}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        />

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            {t("planner.chat.reportCommentSkip")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!comment.trim() || isSending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? "..." : t("planner.chat.reportCommentSend")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
