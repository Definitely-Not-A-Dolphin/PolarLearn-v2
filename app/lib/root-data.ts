import { z } from "zod";

export const themeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

export const rootUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string().nullable(),
  forumBanned: z.boolean().nullable(),
  forumBanReason: z.string().nullable(),
});

export type RootUser = z.infer<typeof rootUserSchema>;

export const rootLoaderDataSchema = z.object({
  theme: themeSchema,
  lang: z.string(),
  user: rootUserSchema,
  impersonatedBy: z.string().nullable(),
});

export type RootLoaderData = z.infer<typeof rootLoaderDataSchema>;
