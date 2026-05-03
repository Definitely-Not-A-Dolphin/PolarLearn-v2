import jsonpatch from "fast-json-patch";
import z from "zod";

import type { ListItem, ListSnapshot } from "~/lib/list";

const jsonPointerSchema = z.string().trim().min(1).refine((value) => value.startsWith("/"), {
  message: "Path must start with /",
});

export const listPatchOperationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    path: jsonPointerSchema,
    value: z.json(),
  }),
  z.object({
    op: z.literal("replace"),
    path: jsonPointerSchema,
    value: z.json(),
  }),
  z.object({
    op: z.literal("remove"),
    path: jsonPointerSchema,
  }),
]);

export const listDiffSchema = z.object({
  changes: z.array(listPatchOperationSchema),
});

export type ListDiff = z.infer<typeof listDiffSchema>;

export function isEmptyListItem(item: ListItem): boolean {
  return item.question.trim() === "" && item.answer.trim() === "";
}

export function snapshotFromEditableItems(items: ListItem[]): ListSnapshot {
  return items.filter((item) => !isEmptyListItem(item));
}

export function buildListDiff(beforeSnapshot: ListSnapshot, afterSnapshot: ListSnapshot): ListDiff {
  return listDiffSchema.parse({
    changes: jsonpatch.compare(beforeSnapshot, afterSnapshot),
  });
}
