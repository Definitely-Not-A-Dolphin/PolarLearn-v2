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

export function snapshotFromEditableItems(items: ListItem[]): ListSnapshot {
  let lastNonEmptyIndex = -1;

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.question.trim() !== "" || item.answer.trim() !== "") {
      lastNonEmptyIndex = i;
      break;
    }
  }

  if (lastNonEmptyIndex === -1) {
    return [];
  }

  return items.slice(0, lastNonEmptyIndex + 1);
}

export function buildListDiff(beforeSnapshot: ListSnapshot, afterSnapshot: ListSnapshot): ListDiff {
  return listDiffSchema.parse({
    changes: jsonpatch.compare(beforeSnapshot, afterSnapshot),
  });
}
