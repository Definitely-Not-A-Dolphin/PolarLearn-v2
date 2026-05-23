import z from "zod";
import { listSnapshot } from "~/lib/list";
import { SubjectNamesArray } from "~/lib/subjectnames";

export const listDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  subject: z.enum(SubjectNamesArray),
  items: listSnapshot,
  collaborators: z.array(z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    displayUsername: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
  })),
  favoritedBy: z.array(z.object({ id: z.string() })),
  versionData: z.record(z.string(), z.unknown()),
});

export type ListData = z.infer<typeof listDataSchema>;

export const loaderDataSchema = z.object({
  list: listDataSchema,
  collaborators: z.array(z.object({ name: z.string(), id: z.string() })),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  user_liked: z.boolean(),
});

export type LoaderData = z.infer<typeof loaderDataSchema>;
