// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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
  const rootData = useRouteLoaderData("root");
  const theme = rootData?.theme ?? "light";
  const isForumBanned = rootData?.user?.forumBanned === true;
  const forumBanReason = rootData?.user?.forumBanReason?.trim();
  const canReply = Boolean(rootData?.user?.id) && !isForumBanned;
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
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("forum.reply.error");
      toast.error(message);
    },
  });
  const isPostingReply = replyMutation.isPending;
  const submitLabel = canReply
    ? t("forum.reply.submit")
    : isForumBanned
      ? t("forum.banned.submitBlocked")
      : t("forum.reply.loginToReply");

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
            {isForumBanned
              ? t("forum.banned.description", {
                reason: forumBanReason || t("forum.banned.noReason"),
              })
              : t("forum.reply.loginToReplyDescription")}
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
