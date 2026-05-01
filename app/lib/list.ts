import z from "zod";
import { SubjectNamesArray } from "./subjectnames";

export const listItem = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const listSnapshot = z.array(listItem);

export type ListItem = z.infer<typeof listItem>;
export type ListSnapshot = z.infer<typeof listSnapshot>;

export const RecentSubjectsSchema = z.array(z.enum(SubjectNamesArray))
export const RecentListsSchema = z.array(z.object({
  id: z.string(),
  // name: z.string(),
  // subject: z.enum(SubjectNamesArray).nullish(),
  // Will be fetched in the recent items method to avoid desync
  updatedAt: z.string(),
}))

export const RecentItemsSchema = z.object({
  recent_subjects: RecentSubjectsSchema,
  recent_lists: RecentListsSchema,
})

export type RecentItems = z.infer<typeof RecentItemsSchema>

export function extractRecentItems(recentItems: unknown): RecentItems {
  const defaultValue: RecentItems = { recent_subjects: [], recent_lists: [] }

  if (!recentItems || typeof recentItems !== 'object') {
    return defaultValue
  }

  const raw = recentItems as Record<string, unknown>
  const recentSubjects = RecentSubjectsSchema.safeParse(raw.recent_subjects).data ?? []
  const recentLists = RecentListsSchema.safeParse(raw.recent_lists).data ?? []

  return {
    recent_subjects: recentSubjects,
    recent_lists: recentLists,
  }
}