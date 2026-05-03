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

type ReplyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplySuccess: (reply: Post) => void;
};

export function ReplyDialog({
  open,
  onOpenChange,
  postId,
  onReplySuccess,
}: ReplyDialogProps) {
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "light";
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

  const handleSubmit = () => {
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
            disabled={isPostingReply}
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
            scheme={theme}
            disabled={isPostingReply || !content.trim()}
            color="dark"
            icon={isPostingReply ? <Loader2 className="animate-spin" /> : <MessageSquareReply />}
          >
            {isPostingReply
              ? t("forum.reply.posting")
              : t("forum.reply.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
