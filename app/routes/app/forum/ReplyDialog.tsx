import { Button } from "@polarnl/polarui-react";
import { useRouteLoaderData } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useTRPC } from "~/server/react";
import { useState } from "react";
import { t } from "~/i18n";
import type { Post } from "~/lib/forum";
import type { RootLoaderData } from "~/lib/root-data";
import { Loader2, MessageSquareReply } from "lucide-react";

export function ReplyDialog({
  open,
  onOpenChange,
  postId,
  onReplySuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplySuccess: (reply: Post) => void;
}) {
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "light";
  const canReply = Boolean(rootData?.user?.id);
  const rpc = useTRPC();

  const [content, setContent] = useState("");

  const replyMutation = useMutation({
    ...rpc.forum.replyToPost.mutationOptions(),
    onSuccess: (reply) => {
      toast.success(t("forum.reply.created"));
      setContent("");
      onReplySuccess(reply);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("forum.reply.error"));
    },
  });
  const isPostingReply = replyMutation.isPending;
  const submitLabel = canReply ? t("forum.reply.submit") : t("forum.reply.loginToReply");

  const handleSubmit = () => {
    if (!canReply) {
      return;
    }

    if (!content.trim()) {
      toast.error(t("forum.reply.contentRequired"));
      return;
    }

    replyMutation.mutate({
      postId,
      content: content.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("forum.reply.title")}
          </DialogTitle>
        </DialogHeader>

        {!canReply ? (
          <p className="text-sm text-muted-foreground">
            {t("forum.reply.loginToReplyDescription")}
          </p>
        ) : null}

        <div>
          <label htmlFor="reply-content" className="font-medium">
            {t("forum.reply.content")}
          </label>
          <textarea
            id="reply-content"
            placeholder={t("forum.reply.placeholder")}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={6}
            disabled={isPostingReply || !canReply}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="transparent" scheme={theme} disabled={isPostingReply}>
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isPostingReply || !canReply || !content.trim()}
            color="sky"
            textColor="white"
            icon={isPostingReply ? <Loader2 className="animate-spin" /> : <MessageSquareReply />}
          >
            {!canReply
              ? submitLabel
              : isPostingReply
                ? t("forum.reply.posting")
                : t("forum.reply.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
