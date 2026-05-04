import { TRPCError } from "@trpc/server";
import { Button, Input } from "@polarnl/polarui-react";
import { useLoaderData, useRouteLoaderData, useNavigate } from "react-router";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Grip, Loader2, Plus, Trash, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import z from "zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import SubjectSelector from "~/components/subject-selector";
import { listItem } from "~/lib/list";
import { buildListDiff, snapshotFromEditableItems } from "~/lib/list-diff";
import { Subject } from "~/lib/subjects";
import { SubjectNamesArray } from "~/lib/subjectnames";
import { useTRPC } from "~/server/react";

import i18n from "~/i18n";
import { appRouter } from "~/server/main";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RootLoaderData, Theme } from "~/lib/root-data";


import type { Route } from "./+types/[id]";

const editableListDraftSchema = z.object({
  name: z.string(),
  subject: z.enum(SubjectNamesArray),
  items: z.array(listItem),
  savedAt: z.number().optional(),
});

type EditableListDraft = z.infer<typeof editableListDraftSchema>;

function createBlankListItem(): EditableListDraft["items"][number] {
  return {
    id: globalThis.crypto.randomUUID(),
    question: "",
    answer: "",
  };
}

function normalizeEditableListItems(items: EditableListDraft["items"]) {
  const seenIds = new Set<string>();

  return items.map((item) => {
    const trimmedId = item.id.trim();
    const nextId = trimmedId === "" ? globalThis.crypto.randomUUID() : trimmedId;

    if (seenIds.has(nextId)) {
      return {
        ...item,
        id: globalThis.crypto.randomUUID(),
      };
    }

    seenIds.add(nextId);

    return {
      ...item,
      id: nextId,
    };
  });
}

function normalizeEditableListDraft(draft: EditableListDraft): EditableListDraft {
  const normalizedItems = normalizeEditableListItems(draft.items);

  return {
    ...draft,
    items: normalizedItems.length === 0 ? [createBlankListItem()] : normalizedItems,
  };
}

function areEditableListItemsEquivalent(left: EditableListDraft["items"][number], right: EditableListDraft["items"][number]) {
  return left.question === right.question
    && left.answer === right.answer;
}

function areEditableListDraftsEquivalent(left: EditableListDraft, right: EditableListDraft) {
  return left.name === right.name
    && left.subject === right.subject
    && left.items.length === right.items.length
    && left.items.every((leftItem, index) => {
      return areEditableListItemsEquivalent(leftItem, right.items[index]);
    });
}

interface DiffOverviewRow {
  leftText: string;
  rightText: string;
  status: "equal" | "changed" | "added" | "removed";
}

function getDiffItem(items: EditableListDraft["items"], index: number) {
  if (index < 0 || index >= items.length) {
    return undefined;
  }

  return items[index];
}

function formatDiffItem(item: EditableListDraft["items"][number] | undefined, index: number, prefix: string) {
  const itemNumber = String(index + 1);

  if (!item) {
    return prefix + " pair " + itemNumber + ": ∅";
  }

  const question = item.question.trim() || "—";
  const answer = item.answer.trim() || "—";

  return prefix + " pair " + itemNumber + ": " + question + " | " + answer;
}

function buildDiffOverviewRows(baseDraft: EditableListDraft, importedDraft: EditableListDraft) {
  const rows: DiffOverviewRow[] = [
    {
      leftText: `- name: ${baseDraft.name.trim() || "—"}`,
      rightText: `+ name: ${importedDraft.name.trim() || "—"}`,
      status: baseDraft.name === importedDraft.name ? "equal" : "changed",
    },
    {
      leftText: `- subject: ${subjects.getSubjectNameById(baseDraft.subject)}`,
      rightText: `+ subject: ${subjects.getSubjectNameById(importedDraft.subject)}`,
      status: baseDraft.subject === importedDraft.subject ? "equal" : "changed",
    },
  ];

  const maxItems = Math.max(baseDraft.items.length, importedDraft.items.length);

  for (let index = 0; index < maxItems; index += 1) {
    const baseItem = getDiffItem(baseDraft.items, index);
    const importedItem = getDiffItem(importedDraft.items, index);

    let status: DiffOverviewRow["status"] = "equal";

    if (baseItem === undefined) {
      status = "added";
    } else if (importedItem === undefined) {
      status = "removed";
    } else if (baseItem.question !== importedItem.question || baseItem.answer !== importedItem.answer) {
      status = "changed";
    }

    rows.push({
      leftText: formatDiffItem(baseItem, index, "-"),
      rightText: formatDiffItem(importedItem, index, "+"),
      status,
    });
  }

  return rows;
}

const subjects = new Subject();

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id;

  if (!id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Missing list id", { status: 400 });
  }

  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });

  const user = context.user;

  if (!user?.id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Unauthorized", { status: 401 });
  }

  const caller = createCallerFactory(appRouter)(context);

  try {
    const list = await caller.list.getLatestListData({ listId: id });

    if (list.collaborators.some((collaborator) => collaborator.id !== user.id)) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response("FORBIDDEN", { status: 403 });
    }

    return {
      list,
      listId: id,
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw new Response("NOT_FOUND", { status: 404 });
    }
    throw error;
  }
}

type LoaderData = Awaited<ReturnType<typeof loader>>

export default function EditListPage() {
  const { list } = useLoaderData<typeof loader>();

  return <EditListEditor key={list.id} list={list} />
}

function EditListEditor({ list }: { list: LoaderData["list"] }) {
  gsap.registerPlugin(useGSAP);

  const t = i18n.t;
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";
  const listName = list.name;
  const listSubject = list.subject;
  const initialDraft = useMemo(() => normalizeEditableListDraft({
    name: listName,
    subject: listSubject,
    items: list.items,
  }), [list.items, listName, listSubject]);
  const localDraftStorageKey = `editlist:${list.id}:draft`;
  const [draft, setDraft] = useState<EditableListDraft>(() => initialDraft);
  const [importedDraft, setImportedDraft] = useState<EditableListDraft | null>(null);
  const [isDraftPersistenceReady, setIsDraftPersistenceReady] = useState(false);
  const [removingDraftItemIds, setRemovingDraftItemIds] = useState<string[]>([]);
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const itemNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const inputNodeRefs = useRef(new Map<string, HTMLInputElement>());
  const previousDraftItemIdsRef = useRef(draft.items.map((item) => item.id));
  const trpc = useTRPC();
  const navigate = useNavigate();

  const updateListMetaMutation = useMutation({
    ...trpc.list.updateListMeta.mutationOptions(),
    onError: () => {
      toast.error(t("errors.unknown"));
    },
  });

  const commitToListMutation = useMutation({
    ...trpc.list.commitToList.mutationOptions(),
    onError: () => {
      toast.error(t("errors.unknown"));
    },
  });

  const itemDiff = useMemo(() => {
    const changes = buildListDiff(
      snapshotFromEditableItems(initialDraft.items),
      snapshotFromEditableItems(draft.items),
    ).changes;

    return { changes };
  }, [draft.items, initialDraft.items]);

  const hasMetaChanges = draft.name !== initialDraft.name || draft.subject !== initialDraft.subject;
  const hasItemChanges = itemDiff.changes.length > 0;
  const isSaving = updateListMetaMutation.isPending || commitToListMutation.isPending;

  useEffect(() => {
    let isCancelled = false;

    void Promise.resolve().then(() => {
      if (isCancelled) {
        return;
      }

      try {
        const rawDraft = window.localStorage.getItem(localDraftStorageKey);

        if (!rawDraft) {
          setIsDraftPersistenceReady(true);
          return;
        }

        const parsedDraft = editableListDraftSchema.safeParse(JSON.parse(rawDraft));

        if (!parsedDraft.success) {
          setIsDraftPersistenceReady(true);
          return;
        }

        const nextImportedDraft = normalizeEditableListDraft(parsedDraft.data);

        if (areEditableListDraftsEquivalent(nextImportedDraft, initialDraft)) {
          setIsDraftPersistenceReady(true);
          return;
        }

        setImportedDraft(nextImportedDraft);
        setIsDraftPersistenceReady(true);
      } catch {
        setIsDraftPersistenceReady(true);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [initialDraft, localDraftStorageKey]);

  useEffect(() => {
    if (!isDraftPersistenceReady) {
      return;
    }

    try {
      if (areEditableListDraftsEquivalent(draft, initialDraft)) {
        window.localStorage.removeItem(localDraftStorageKey);
        return;
      }

      window.localStorage.setItem(localDraftStorageKey, JSON.stringify({
        savedAt: Date.now(),
        ...draft,
      }));
    } catch {
      return;
    }
  }, [draft, initialDraft, isDraftPersistenceReady, localDraftStorageKey]);

  const discardLocalDraft = () => {
    try {
      window.localStorage.removeItem(localDraftStorageKey);
    } catch {
      // Ignore storage failures and just continue with the server draft.
    }

    setImportedDraft(null);
    setIsDraftPersistenceReady(true);
  };

  const handleCommit = async () => {
    const nextCommitMessage = commitMessage.trim();

    try {
      if (hasMetaChanges) {
        await updateListMetaMutation.mutateAsync({
          id: list.id,
          ...(draft.name !== initialDraft.name ? { name: draft.name } : {}),
          ...(draft.subject !== initialDraft.subject ? { subject: draft.subject } : {}),
        });
      }

      if (hasItemChanges) {
        await commitToListMutation.mutateAsync({
          id: list.id,
          branch: "main",
          baseCommitId: list.versionData.branches.main.headCommitId,
          commitMessage: nextCommitMessage,
          diff: itemDiff,
        });
      }

      if (!hasMetaChanges && !hasItemChanges) {
        setIsSaveDialogOpen(false);
        setCommitMessage("");
        return;
      }

      setIsSaveDialogOpen(false);
      setCommitMessage("");

      try {
        window.localStorage.removeItem(localDraftStorageKey);
      } catch {
        // fuck you eslint
      }

      void navigate(`/app/viewlist/${list.id}`);
    } catch {
      return;
    }
  };

  const applyLocalDraft = () => {
    if (!importedDraft) {
      return;
    }

    setDraft(normalizeEditableListDraft(importedDraft));
    setImportedDraft(null);
    setIsDraftPersistenceReady(true);
  };

  const appendDraftItem = (focusNewItem: boolean) => {
    const newItem = createBlankListItem();

    setDraft((currentDraft) => ({
      ...currentDraft,
      items: [...currentDraft.items, newItem],
    }));

    if (focusNewItem) {
      requestAnimationFrame(() => {
        const input = inputNodeRefs.current.get(newItem.id);

        input?.focus();
        input?.select();
      });
    }
  };

  useGSAP(() => {
    const currentItemIds = draft.items.map((item) => item.id);
    const previousItemIds = new Set(previousDraftItemIdsRef.current);
    const addedItemIds = currentItemIds.filter((itemId) => !previousItemIds.has(itemId));

    previousDraftItemIdsRef.current = currentItemIds;

    for (const itemId of addedItemIds) {
      const node = itemNodeRefs.current.get(itemId);

      if (!node) {
        continue;
      }

      gsap.fromTo(
        node,
        {
          height: 0,
          opacity: 0,
          y: -12,
        },
        {
          height: "auto",
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          clearProps: "height,opacity,transform",
        },
      )
    }
  }, [draft.items.length]);

  return (
    <main className="p-6">
      <DraftImportDialog
        open={Boolean(importedDraft)}
        baseDraft={initialDraft}
        importedDraft={importedDraft}
        theme={theme}
        onDiscardLocalDraft={discardLocalDraft}
        onApplyLocalDraft={applyLocalDraft}
      />
      <SaveDialog
        open={isSaveDialogOpen}
        theme={theme}
        commitMessage={commitMessage}
        isSaving={isSaving}
        onCommitMessageChange={setCommitMessage}
        onOpenChange={(open) => {
          setIsSaveDialogOpen(open);

          if (!open) {
            setCommitMessage("");
          }
        }}
        onSave={() => { void handleCommit(); }}
      />
      <div className="relative flex flex-row items-center">
        <Button variant="transparent" scheme={theme} icon={<X />} onClick={() => {
          void navigate(`/app`);
        }}>
          {t("common.close")}
        </Button>
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-3xl font-bold">
          {t("lists.edit.title")}
        </h1>
        <div className="grow" />
        <Button variant="transparent" scheme={theme} icon={<Save />} onClick={() => {
          setIsSaveDialogOpen(true);
        }}>
          {t("lists.edit.save")}
        </Button>
      </div>
      <div className="mt-4">
        <p className="font-bold">{t("lists.edit.nameLabel")}</p>
        <Input
          scheme={theme}
          value={draft.name}
          onChange={(event) => {
            setDraft((currentDraft) => ({
              ...currentDraft,
              name: event.target.value,
            }));
          }}
          className="mt-2"
          placeholder={t("lists.nameInputPlaceholder")}
        />
        <div className="mt-4">
          <p className="font-bold">{t("home.subject")}</p>
          <SubjectSelector
            selected={draft.subject}
            onSelect={(subjectId) => {
              setDraft((currentDraft) => ({
                ...currentDraft,
                subject: subjectId,
              }));
              setIsSubjectSelectorOpen(false);
            }}
            open={isSubjectSelectorOpen}
            onOpenChange={setIsSubjectSelectorOpen}
            subjects={subjects}
          />
        </div>
        <DragDropContext
          onDragEnd={(result) => {
            const { destination, source } = result;

            if (!destination || destination.index === source.index) {
              return;
            }

            setDraft((currentDraft) => {
              const nextItems = [...currentDraft.items];
              const movedItem = nextItems.at(source.index);

              if (movedItem === undefined) {
                return currentDraft;
              }

              nextItems.splice(source.index, 1);
              nextItems.splice(destination.index, 0, movedItem);

              return {
                ...currentDraft,
                items: nextItems,
              };
            });
          }}
        >
          <Droppable droppableId="edit-list-items" direction="vertical">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`mt-4 flex min-h-24 flex-col gap-3 rounded-lg border p-3 transition-colors ${snapshot.isDraggingOver ? "border-sky-500/60 bg-muted/60" : "border-border bg-muted/30"}`}
              >
                {draft.items.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    isDragDisabled={removingDraftItemIds.includes(item.id)}
                  >
                    {(draggableProvided, draggableSnapshot) => (
                      <div
                        ref={(node) => {
                          draggableProvided.innerRef(node);

                          if (node) {
                            itemNodeRefs.current.set(item.id, node);
                            return;
                          }

                          itemNodeRefs.current.delete(item.id);
                        }}
                        {...draggableProvided.draggableProps}
                        className={`overflow-hidden ${removingDraftItemIds.includes(item.id) ? "pointer-events-none" : ""}`}
                      >
                        <div
                          className={`flex min-h-20 items-center rounded-lg border border-border bg-card px-2 py-4 transition-shadow ${draggableSnapshot.isDragging ? "shadow-lg ring-1 ring-sky-500/60" : ""}`}
                        >
                          <p className="pr-2 font-bold">{index + 1}</p>
                          <Input
                            ref={(node) => {
                              if (node) {
                                inputNodeRefs.current.set(item.id, node);
                                return;
                              }

                              inputNodeRefs.current.delete(item.id);
                            }}
                            scheme={theme}
                            placeholder={t("lists.create.keyInputPlaceholder")}
                            value={item.question}
                            onChange={(event) => {
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                items: currentDraft.items.map((currentItem) => (
                                  currentItem.id === item.id
                                    ? { ...currentItem, question: event.target.value }
                                    : currentItem
                                )),
                              }));
                            }}
                            className="min-w-0 flex-1"
                          />
                          <Input
                            scheme={theme}
                            placeholder={t("lists.create.valueInputPlaceholder")}
                            value={item.answer}
                            onChange={(event) => {
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                items: currentDraft.items.map((currentItem) => (
                                  currentItem.id === item.id
                                    ? { ...currentItem, answer: event.target.value }
                                    : currentItem
                                )),
                              }));
                            }}
                            onKeyDown={(event) => {
                              if (index !== draft.items.length - 1 || event.key !== "Tab" || event.shiftKey) {
                                return;
                              }

                              event.preventDefault();
                              appendDraftItem(true);
                            }}
                            className="ml-2 min-w-0 flex-1"
                          />
                          <Button
                            type="button"
                            tabIndex={-1}
                            title={t("lists.edit.removeItem")}
                            onClick={() => {
                              if (removingDraftItemIds.includes(item.id)) {
                                return;
                              }

                              const node = itemNodeRefs.current.get(item.id);

                              if (!node) {
                                setDraft((currentDraft) => {
                                  if (currentDraft.items.length === 1) {
                                    return currentDraft;
                                  }

                                  return {
                                    ...currentDraft,
                                    items: currentDraft.items.filter((currentItem) => currentItem.id !== item.id),
                                  };
                                });

                                return;
                              }

                              setRemovingDraftItemIds((currentRemovingItemIds) => [...currentRemovingItemIds, item.id]);
                              gsap.killTweensOf(node);

                              gsap.to(node, {
                                height: 0,
                                opacity: 0,
                                y: -12,
                                scale: 0.98,
                                duration: 0.28,
                                ease: "power2.in",
                                onComplete: () => {
                                  setDraft((currentDraft) => {
                                    if (currentDraft.items.length === 1) {
                                      return currentDraft;
                                    }

                                    return {
                                      ...currentDraft,
                                      items: currentDraft.items.filter((currentItem) => currentItem.id !== item.id),
                                    };
                                  });
                                  setRemovingDraftItemIds((currentRemovingItemIds) => currentRemovingItemIds.filter((id) => id !== item.id));
                                  itemNodeRefs.current.delete(item.id);
                                },
                              });
                            }}
                            disabled={draft.items.length === 1 || removingDraftItemIds.includes(item.id)}
                            variant="transparent"
                            scheme={theme}
                            className="mx-1 flex h-10 w-10 min-h-0 min-w-0 shrink-0 items-center justify-center rounded-md p-0 leading-none text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/15"
                          >
                            <span className="flex items-center justify-center leading-none">
                              <Trash className="h-5 w-5" tabIndex={-1} />
                            </span>
                          </Button>
                          <Button
                            {...(draggableProvided.dragHandleProps ?? {})}
                            type="button"
                            tabIndex={-1}
                            variant="transparent"
                            scheme={theme}
                            className="mr-1 flex h-10 w-10 min-h-0 min-w-0 shrink-0 cursor-grab items-center justify-center rounded-md p-0 leading-none transition hover:bg-muted active:cursor-grabbing"
                          >
                            <span className="flex items-center justify-center leading-none">
                              <Grip className="h-5 w-5" tabIndex={-1} />
                            </span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <Button
          type="button"
          tabIndex={-1}
          onClick={() => {
            appendDraftItem(true);
          }}
          variant="transparent"
          scheme={theme}
          className="mt-4 flex h-24 w-full items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 p-0 transition hover:bg-muted cursor-pointer"
          icon={<Plus className="h-6 w-6" />}
        >
          <span className="text-xl font-semibold">{t("lists.edit.addPair")}</span>
        </Button>
      </div>
    </main>
  )
}

function SaveDialog({
  open,
  onOpenChange,
  theme,
  commitMessage,
  isSaving,
  onCommitMessageChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  commitMessage: string;
  isSaving: boolean;
  onCommitMessageChange: (value: string) => void;
  onSave: () => void;
}) {
  const t = i18n.t;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">{t("lists.edit.almostDone")}</DialogTitle>
          <DialogDescription>
            {t("lists.edit.giveDiffAName")}
          </DialogDescription>
        </DialogHeader>
        <Input
          scheme={theme}
          placeholder={t("lists.edit.giveDiffAName")}
          className="mt-4"
          value={commitMessage}
          onChange={(event) => {
            onCommitMessageChange(event.target.value);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="transparent" scheme={theme} icon={<X />}>
              {t("navigation.cancel")}
            </Button>
          </DialogClose>
          <Button
            color="sky"
            textColor="white"
            onClick={() => { onSave(); }}
            disabled={isSaving}
            icon={isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          >
            {t("lists.edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DraftImportDialog({
  open,
  baseDraft,
  importedDraft,
  theme,
  onDiscardLocalDraft,
  onApplyLocalDraft,
}: {
  open: boolean;
  baseDraft: EditableListDraft;
  importedDraft: EditableListDraft | null;
  theme: Theme;
  onDiscardLocalDraft: () => void;
  onApplyLocalDraft: () => void;
}) {
  const t = i18n.t;
  const rawPatchOperations = useMemo(() => {
    if (!importedDraft) {
      return [];
    }

    return buildDiffOverviewRows(baseDraft, importedDraft);
  }, [baseDraft, importedDraft]);

  if (!importedDraft) {
    return null;
  }

  if (importedDraft.savedAt === undefined) {
    return null;
  }

  const savedAtLabel = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(importedDraft.savedAt);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-5xl"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-xl">{t("lists.edit.importDraft.title")}</DialogTitle>
          <DialogDescription>
            {t("lists.edit.importDraft.description", { savedAtLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
          <div className="grid grid-cols-2 border-b border-border bg-muted/40 text-sm text-muted-foreground">
            <div className="px-4 py-3">{t("lists.edit.importDraft.currentVersion")}</div>
            <div className="border-l border-border px-4 py-3">{t("lists.edit.importDraft.localDraft")}</div>
          </div>
          <div className="max-h-[62vh] overflow-auto">
            {rawPatchOperations.map((row, index) => {
              const isEqual = row.status === "equal";
              const leftTone = row.status === "removed"
                ? "bg-destructive/15 text-destructive"
                : isEqual
                  ? ""
                  : "bg-destructive/10";
              const rightTone = row.status === "added"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                : isEqual
                  ? ""
                  : "bg-emerald-500/10";

              return (
                <div
                  key={String(index) + "-" + row.leftText}
                  className="grid grid-cols-2 border-b border-border/60 font-mono text-[13px] leading-6 text-foreground last:border-b-0"
                >
                  <div className={`px-4 py-3 ${leftTone}`}>
                    {row.leftText}
                  </div>
                  <div className={`border-l border-border px-4 py-3 ${rightTone}`}>
                    {row.rightText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="transparent" scheme={theme} onClick={onDiscardLocalDraft}>
            {t("lists.edit.importDraft.keepServerVersion")}
          </Button>
          <Button color="sky" textColor="white" onClick={onApplyLocalDraft}>
            {t("lists.edit.importDraft.importLocalChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
