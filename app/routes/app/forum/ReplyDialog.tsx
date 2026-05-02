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

export function ReplyDialog({
  open,
  onOpenChange,
  postId,
  onReplySuccess,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onReplySuccess: (reply: Post) => void;
}) {
  const rootData = useRouteLoaderData<{ theme: "light" | "dark" }>("root");
  const theme = rootData?.theme ?? "light";
  const rpc = useTRPC();

  const [content, setContent] = useState("");

  const replyMutation = useMutation({
    ...rpc.forum.replyToPost.mutationOptions(),
    onSuccess: (reply) => {
      toast.success(t("forum.reply.created", { defaultValue: "Reply posted!" }));
      setContent("");
      onReplySuccess(reply);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("forum.reply.error", { defaultValue: "Failed to post reply" }));
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error(t("forum.reply.contentRequired", { defaultValue: "Reply cannot be empty" }));
      return;
    }

    replyMutation.mutate({
      postId,
      content: content.trim(),
    });
  };

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("forum.reply.title", { defaultValue: "Reply to post" })}
          </DialogTitle>
        </DialogHeader>

        <div>
          <label htmlFor="reply-content" className="font-medium">
            {t("forum.reply.content", { defaultValue: "Your reply" })}
          </label>
          <textarea
            id="reply-content"
            placeholder={t("forum.reply.placeholder", { defaultValue: "Write your reply..." })}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            rows={6}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" scheme={theme}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            scheme={theme}
            disabled={replyMutation.isPending || !content.trim()}
            color="dark"
          >
            {replyMutation.isPending
              ? t("forum.reply.posting", { defaultValue: "Posting..." })
              : t("forum.reply.submit", { defaultValue: "Post reply" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
