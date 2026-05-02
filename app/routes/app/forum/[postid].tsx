import { useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useLoaderData, useRouteLoaderData } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { appRouter } from "~/server/main";
import { getCategoryInfo, type GetPostRepliesOutput, type Post } from "~/lib/forum";
import { Subject } from "~/lib/subjects";
import type { SubjectNames } from "~/lib/subjectnames";
import { UserAvatar } from "~/components/user-avatar";
import { Badge } from "~/components/ui/badge";
import i18n from "~/i18n";
import { useTRPC } from "~/server/react";
import type { Route } from "./+types/[postid]";
import { Button } from "@polarnl/polarui-react";
import { ReplyDialog } from "./ReplyDialog";
import { MessageSquareReply } from "lucide-react";

const REPLIES_PER_PAGE = 10;

export async function loader({ params, request }: Route.LoaderArgs) {
  const postId = params.postid;
  if (!postId) {
    return (
      <p>buddy how the fuck did you get this to appear you done something fucked up 🙏😭</p>
    )
  }

  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });
  const caller = createCallerFactory(appRouter)(context);

  const post = await caller.forum.getPost({ id: postId });
  const initialReplies = await caller.forum.getPostReplies({
    postId,
    limit: REPLIES_PER_PAGE,
  });

  return { post, initialReplies };
}

export default function PostPage() {
  const { post, initialReplies } = useLoaderData<typeof loader>() as {
    post: Post;
    initialReplies: GetPostRepliesOutput;
  };
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const author = post.author as { name: string; image: string | null; displayUsername: string | null } | null;
  const authorName = author?.name ?? null;
  const authorImage = author?.image ?? null;
  const currentCategory = getCategoryInfo(post.category);
  const CategoryIcon = currentCategory.icon;
  const t = i18n.t;
  const subjects = new Subject();
  const [replies, setReplies] = useState(initialReplies.replies);
  const [nextCursor, setNextCursor] = useState<string | null>(initialReplies.nextCursor);
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const rootData = useRouteLoaderData("root") as { theme: "light" | "dark" };

  const fetchMoreReplies = async () => {
    if (!nextCursor || isLoadingMoreReplies) {
      return;
    }

    setIsLoadingMoreReplies(true);
    try {
      const nextPage = await queryClient.fetchQuery(
        trpc.forum.getPostReplies.queryOptions({
          postId: post.id,
          cursor: nextCursor,
          limit: REPLIES_PER_PAGE,
        }),
      );

      setReplies((currentReplies) => [...currentReplies, ...nextPage.replies]);
      setNextCursor(nextPage.nextCursor);
    } finally {
      setIsLoadingMoreReplies(false);
    }
  };

  const handleReplySuccess = (newReply: Post) => {
    setReplies((currentReplies) => [newReply, ...currentReplies]);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <UserAvatar
            name={authorName}
            image={authorImage}
            size="lg"
            className="size-12"
          />
          <div className="flex flex-col">
            <span className="font-medium">
              {post.author?.displayUsername ?? post.author?.name ?? "Unknown"}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatDate(post.createdAt)}
            </span>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-auto rounded px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: currentCategory.color }}
          >
            <CategoryIcon className="mr-1 h-3 w-3" />
            {t(currentCategory.label)}
          </Badge>
          {post.category === "school-related" && post.subject && (
            <div className="flex items-center gap-1">
              {subjects.getIcon(post.subject as SubjectNames, { width: 16, height: 16 })}
              <span className="text-xs text-muted-foreground">
                {subjects.getSubjectNameById(post.subject as SubjectNames)}
              </span>
            </div>
          )}
        </div>

        {post.title && (
          <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>
      <Button
        scheme={rootData.theme}
        variant="transparent"
        icon={<MessageSquareReply />}
        onClick={() => setReplyDialogOpen(true)}
        className="ml-4"
      >
        {i18n.t("forum.reply.buttonLabel")}
      </Button>

      <ReplyDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        postId={post.id}
        onReplySuccess={handleReplySuccess}
      />

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {i18n.t("forum.replies.title")}
        </h2>

        <InfiniteScroll
          dataLength={replies.length}
          next={fetchMoreReplies}
          hasMore={Boolean(nextCursor)}
          scrollThreshold={0.8}
          loader={
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              {isLoadingMoreReplies
                ? i18n.t("forum.replies.loadingMore", { defaultValue: "Loading more replies..." })
                : null}
            </div>
          }
          endMessage={
            replies.length > 0 ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                {i18n.t("forum.replies.noMore", { defaultValue: "You’ve reached the end." })}
              </div>
            ) : null
          }
        >
          <div className="space-y-3">
            {replies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {i18n.t("forum.replies.empty", { defaultValue: "No replies yet." })}
              </div>
            ) : (
              replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)
            )}
          </div>
        </InfiniteScroll>
      </div>
    </div>
  );
}

function ReplyCard({ reply }: { reply: Post }) {
  const author = reply.author as { name: string; image: string | null; displayUsername: string | null } | null;

  return (
    <article className="rounded-lg border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar
          name={author?.name ?? null}
          image={author?.image ?? null}
          size="sm"
          className="size-10"
        />
        <div className="flex flex-col">
          <span className="font-medium">
            {reply.author?.displayUsername ?? reply.author?.name ?? "Unknown"}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDate(reply.createdAt)}
          </span>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap">{reply.content}</p>
      </div>
    </article>
  );
}

function formatDate(date: Date | string): string {
  const parsedDate = date instanceof Date ? date : new Date(date);
  return parsedDate.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
