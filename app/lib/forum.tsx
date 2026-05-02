import { z } from "zod";
import { Globe, GraduationCap, Megaphone, type LucideIcon } from "lucide-react";


export type CategoryInfo = {
  label: string
  color: string
  icon: LucideIcon
}

export const categories = ["school-related", "non-school-related", "announcement"] as const

export const fullCategories = {
  "school-related": {
    label: "forum.categories.schoolRelated",
    color: "#3b82f6",
    icon: GraduationCap,
  },
  "non-school-related": {
    label: "forum.categories.nonSchoolRelated",
    color: "#16a34a",
    icon: Globe,
  },
  "announcement": {
    label: "forum.categories.announcement",
    color: "#ef4444",
    icon: Megaphone,
  },
} satisfies Record<(typeof categories)[number], CategoryInfo>

export function getCategoryInfo(category: string): CategoryInfo {
  switch (category) {
    case "school-related":
      return fullCategories["school-related"]
    case "non-school-related":
      return fullCategories["non-school-related"]
    case "announcement":
      return fullCategories.announcement
    default:
      throw new Error(`Unknown category: ${category}`)
  }
}

export const getPostsInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  category: z.enum(categories).optional(),
  authorId: z.string().min(1).optional(),
});

export type GetPostsInput = z.infer<typeof getPostsInputSchema>;

export const getPostInputSchema = z.object({
  id: z.string().min(1),
});

export type GetPostInput = z.infer<typeof getPostInputSchema>;

export const createPostInputSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  subject: z.string().min(1).max(255).optional(),
  category: z.enum(categories),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const editPostInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  subject: z.string().min(1).max(255).optional(),
  category: z.enum(categories).optional(),
});

export type EditPostInput = z.infer<typeof editPostInputSchema>;

export const deletePostInputSchema = z.object({
  id: z.string().min(1),
});

export type DeletePostInput = z.infer<typeof deletePostInputSchema>;

export const voteSchema = z.enum(["up", "down"]);
export type Vote = z.infer<typeof voteSchema>;

export const votersSchema = z.record(z.string().min(1), voteSchema);
export type Voters = z.infer<typeof votersSchema>;

export const votePostInputSchema = z.object({
  id: z.string().min(1),
  vote: voteSchema,
});

export type VotePostInput = z.infer<typeof votePostInputSchema>;

export const replyToPostInputSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1),
});

export type ReplyToPostInput = z.infer<typeof replyToPostInputSchema>;

export const postAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayUsername: z.string().nullable(),
  image: z.string().nullable(),
});

export type PostAuthor = z.infer<typeof postAuthorSchema>;

export const postSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  category: z.string(),
  subject: z.string().nullable(),
  cachedTotalVotes: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  author: postAuthorSchema.nullable(),
});

export type Post = z.infer<typeof postSchema>;

export const getPostsOutputSchema = z.object({
  posts: z.array(postSchema),
  nextCursor: z.string().nullable(),
});

export type GetPostsOutput = z.infer<typeof getPostsOutputSchema>;

export const getPostRepliesInputSchema = z.object({
  postId: z.string().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type GetPostRepliesInput = z.infer<typeof getPostRepliesInputSchema>;

export const getPostRepliesOutputSchema = z.object({
  replies: z.array(postSchema),
  nextCursor: z.string().nullable(),
});

export type GetPostRepliesOutput = z.infer<typeof getPostRepliesOutputSchema>;
