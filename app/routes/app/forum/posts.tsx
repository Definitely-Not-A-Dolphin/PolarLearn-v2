import { useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/server/react";
import { type GetPostsOutput, type Post, fullCategories } from "~/lib/forum";
import i18n from "~/i18n";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { appRouter } from "~/server/main";
import type { Route } from "./+types/posts";
import { Subject } from "~/lib/subjects";
import type { SubjectNames } from "~/lib/subjectnames";
import { UserAvatar } from "~/components/user-avatar";
import { Badge } from "~/components/ui/badge";

const POSTS_PER_PAGE = 10;

export async function loader({ request }: Route.LoaderArgs): Promise<{ initialPosts: GetPostsOutput }> {
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });
  const caller = createCallerFactory(appRouter)(context);

  const initialPosts = await caller.forum.getPosts({
    limit: POSTS_PER_PAGE,
    cursor: undefined,
  });

  return { initialPosts };
}

export default function PostsPage() {
  const { initialPosts } = useLoaderData<typeof loader>();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const postsQueryOptions = trpc.forum.getPosts.queryOptions({
    limit: POSTS_PER_PAGE,
    cursor: cursor ?? undefined,
  });

  const query = useQuery({
    ...postsQueryOptions,
  });

  const currentData = query.data ?? initialPosts;
  const posts = currentData.posts;

  const fetchMore = () => {
    if (currentData.nextCursor) {
      setCursor(currentData.nextCursor);
    }
  };

  if (query.isError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">{i18n.t("forum.posts.failedToLoad")}</div>
      </div>
    );
  }

  return (
    <div>
      <InfiniteScroll
        dataLength={posts.length}
        next={fetchMore}
        hasMore={Boolean(currentData.nextCursor)}
        loader={
          <div className="flex items-center justify-center p-4">
            <div className="text-muted-foreground">{i18n.t("forum.posts.loadingMore")}</div>
          </div>
        }
        endMessage={
          posts.length > 0 ? (
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              {i18n.t("forum.posts.noMore")}
            </div>
          ) : null
        }
      >
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{i18n.t("forum.posts.empty")}</h3>
              <p className="text-muted-foreground">
                {i18n.t("forum.posts.beFirst")}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => {
                  void navigate(`/app/forum/posts/${post.id}`);
                }}
              />
            ))
          )}
        </div>
      </InfiniteScroll>
    </div>
  );
}

function PostCard({
  post,
  onClick,
}: {
  post: Post;
  onClick: () => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
  };
  const subjects = new Subject();
  const author = post.author as { name: string; image: string | null } | null;
  const authorName = author?.name ?? null;
  const authorImage = author?.image ?? null;
  const currentCategory = fullCategories[post.category];
  const t = i18n.t

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition hover:bg-muted"
      onClick={handleClick}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          <UserAvatar
            name={authorName}
            image={authorImage}
            size="lg"
            className="size-12 shrink-0"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-auto rounded px-2 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: fullCategories[post.category]?.color }}
            >
              {currentCategory?.icon && (
                <currentCategory.icon className="mr-1 h-3 w-3" />
              )}
              {t(currentCategory?.label)}
            </Badge>
            {post.category === "school-related" && post.subject && (
              <>
                <div className="flex items-center gap-1">
                  {subjects.getIcon(post.subject as SubjectNames, { width: 16, height: 16 })}
                  <span className="text-xs text-muted-foreground">
                    {subjects.getSubjectNameById(post.subject as SubjectNames)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">•</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(post.createdAt)}
            </span>
          </div>

          {post.title && (
            <h3 className="mb-2 line-clamp-2 font-semibold text-foreground">{post.title}</h3>
          )}

          {post.content && (
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {post.content}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Door: {post.author?.displayUsername ?? post.author?.name ?? "Unknown"}</span>
          </div>
        </div>

      </div>
    </button>
  );
}

function formatDate(date: Date | string): string {
  const parsedDate = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return i18n.t("forum.posts.time.justNow", { defaultValue: "just now" });
  }
  if (diffMins < 60) {
    return `${String(diffMins)}m geleden`;
  }
  if (diffHours < 24) {
    return `${String(diffHours)}u geleden`;
  }
  if (diffDays < 7) {
    return `${String(diffDays)}d geleden`;
  }
  return parsedDate.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}
