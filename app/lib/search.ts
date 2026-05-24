import { z } from "zod";

import { forumCategorySchema, getPostsOutputSchema } from "~/lib/forum";
import {
  listResultSchema,
  listResultUserSchema,
  type ListResult,
  type ListResultUser,
} from "~/lib/list";

export const searchPageInputSchema = z.object({
  q: z.string().trim().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchPageInput = z.infer<typeof searchPageInputSchema>;

export const searchUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayUsername: z.string().nullable(),
  username: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  forumBanned: z.boolean().nullable(),
  createdAt: z.date(),
});

export type SearchUser = z.infer<typeof searchUserSchema>;

export const searchUsersOutputSchema = z.object({
  users: z.array(searchUserSchema),
  nextCursor: z.string().nullable(),
});

export type SearchUsersOutput = z.infer<typeof searchUsersOutputSchema>;

// Aliases for backward compatibility -- canonical schemas live in ~/lib/list
export const searchListUserSchema = listResultUserSchema;
export type SearchListUser = ListResultUser;
export const searchListSchema = listResultSchema;
export type SearchList = ListResult;

export const searchListsOutputSchema = z.object({
  lists: z.array(listResultSchema),
  nextCursor: z.string().nullable(),
});

export type SearchListsOutput = z.infer<typeof searchListsOutputSchema>;

export const searchGroupMemberSchema = z.object({
  id: z.string(),
});

export type SearchGroupMember = z.infer<typeof searchGroupMemberSchema>;

export const searchGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  members: z.array(searchGroupMemberSchema),
});

export type SearchGroup = z.infer<typeof searchGroupSchema>;

export const searchGroupsOutputSchema = z.object({
  groups: z.array(searchGroupSchema),
  nextCursor: z.string().nullable(),
});

export type SearchGroupsOutput = z.infer<typeof searchGroupsOutputSchema>;

export const searchForumOutputSchema = getPostsOutputSchema;
export type SearchForumOutput = z.infer<typeof searchForumOutputSchema>;

export const searchForumInputSchema = searchPageInputSchema;
export const searchListsInputSchema = searchPageInputSchema;
export const searchGroupsInputSchema = searchPageInputSchema;
export const searchUsersInputSchema = searchPageInputSchema;

export const searchForumCategorySchema = forumCategorySchema;
