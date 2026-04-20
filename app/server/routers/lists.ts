import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import crypto from "crypto";
import * as jsonpatch from "fast-json-patch";
import { SubjectNamesArray } from "~/lib/subjects";
import { TRPCError } from "@trpc/server";

function generateCommitHash(diff: Diff): string {
  return crypto.createHash("sha256")
    .update(JSON.stringify(diff) +
      crypto.randomBytes(32).toString("hex")
      /* random data so hash is unique, no conflicts */)
    .digest("hex");
}

export const RecentItemsSchema = z.array(z.object({
  type: z.enum(['list', 'quiz']),
  itemId: z.string(),
  name: z.string(),
  subject: z.enum(SubjectNamesArray),
  added: z.date(),
}))

const jsonPointerSchema = z.string().trim().min(1).refine((value) => value.startsWith('/'), {
  message: 'Path must start with /'
})

export const listPatchOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add'),
    path: jsonPointerSchema,
    value: z.json()
  }),
  z.object({
    op: z.literal('replace'),
    path: jsonPointerSchema,
    value: z.json()
  }),
  z.object({
    op: z.literal('remove'),
    path: jsonPointerSchema
  })
])

export const listItem = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
})

const listSnapshotSchema = z.array(listItem)

const pullRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['open', 'closed', 'merged'])
})

type ListSnapshot = z.infer<typeof listSnapshotSchema>

const branchRecordSchema = z.object({
  owner: z.string(),
  baseCommitId: z.string(),
  headCommitId: z.string(),
  parentBranch: z.string().optional(),
  isPR: z.boolean().optional(),
  PR: pullRequestSchema.optional(),
  cachedSnapshot: listSnapshotSchema,
})

export const branch = z.record(z.string(), branchRecordSchema)

export const diff = z.object({
  changes: z.array(listPatchOperationSchema).min(1),
})

export type Diff = z.infer<typeof diff>

const versionCommitSchema = z.object({
  parentId: z.string().nullish(),
  author: z.string(),
  message: z.string(),
  createdAt: z.string(),
  diff,
})

export const versionData = z.object({
  branches: branch,
  commits: z.record(z.string(), versionCommitSchema)
})

const branchSummarySchema = z.object({
  name: z.string(),
  owner: z.string(),
  baseCommitId: z.string(),
  headCommitId: z.string(),
  parentBranch: z.string().optional(),
  isPR: z.boolean().optional(),
  PR: pullRequestSchema.optional(),
})

const branchHistoryEntrySchema = z.object({
  id: z.string(),
  parentId: z.string().nullish(),
  author: z.string(),
  message: z.string(),
  createdAt: z.string(),
  diff,
})

const listRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  subject: z.enum(SubjectNamesArray),
  userId: z.string(),
  items: listSnapshotSchema,
  versionData,
  collaborators: z.array(z.object({ id: z.string() })),
}).passthrough()

type VersionCommit = z.infer<typeof versionCommitSchema>
type VersionData = z.infer<typeof versionData>
type BranchRecord = z.infer<typeof branchRecordSchema>
type ListRecord = z.infer<typeof listRecordSchema>
type ListItem = z.infer<typeof listItem>

const listItemFields: Array<Exclude<keyof ListItem, 'id'>> = ['question', 'answer']

function areListItemsEqual(left: ListItem, right: ListItem): boolean {
  return left.id === right.id
    && left.question === right.question
    && left.answer === right.answer
}

function hasBranchAccess(list: ListRecord, branch: BranchRecord, userId: string): boolean {
  return list.userId === userId
    || list.collaborators.some((collaborator) => collaborator.id === userId)
    || branch.owner === userId
}

function getBranchOrThrow(versioning: VersionData, branchName: string): BranchRecord {
  const selectedBranch = versioning.branches[branchName]

  if (!selectedBranch) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Branch ${branchName} was not found`,
    })
  }

  return selectedBranch
}

function getCommitSnapshot(versioning: VersionData, commitId: string): ListSnapshot {
  const commitsInOrder: Array<VersionCommit> = []

  let currentCommitId: string | null | undefined = commitId

  while (currentCommitId) {
    const commit: VersionCommit | undefined = versioning.commits[currentCommitId]

    if (!commit) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Commit ${currentCommitId} was not found`,
      })
    }

    commitsInOrder.push(commit)
    currentCommitId = commit.parentId ?? undefined
  }

  return commitsInOrder
    .reverse()
    .reduce<ListSnapshot>((snapshot, commit) => applyListDiffToSnapshot(snapshot, commit.diff), [])
}

function mergeListItem(baseItem: ListItem, mainItem: ListItem, branchItem: ListItem): ListItem {
  const mergedItem = structuredClone(baseItem) as ListItem

  for (const field of listItemFields) {
    const baseValue = baseItem[field]
    const mainValue = mainItem[field]
    const branchValue = branchItem[field]

    if (Object.is(mainValue, branchValue)) {
      mergedItem[field] = mainValue
      continue
    }

    const mainChanged = !Object.is(mainValue, baseValue)
    const branchChanged = !Object.is(branchValue, baseValue)

    if (mainChanged && branchChanged) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Unable to merge item ${baseItem.id} because both branches changed ${field}`,
      })
    }

    if (mainChanged) {
      mergedItem[field] = mainValue
      continue
    }

    if (branchChanged) {
      mergedItem[field] = branchValue
      continue
    }

    mergedItem[field] = baseValue
  }

  return mergedItem
}

function mergeSnapshots(base: ListSnapshot, main: ListSnapshot, branch: ListSnapshot): ListSnapshot {
  const baseById = new Map(base.map((item) => [item.id, item]))
  const mainById = new Map(main.map((item) => [item.id, item]))
  const branchById = new Map(branch.map((item) => [item.id, item]))
  const mergedById = new Map<string, ListItem>()

  const allItemIds = new Set([
    ...baseById.keys(),
    ...mainById.keys(),
    ...branchById.keys(),
  ])

  for (const itemId of allItemIds) {
    const baseItem = baseById.get(itemId)
    const mainItem = mainById.get(itemId)
    const branchItem = branchById.get(itemId)

    if (!baseItem) {
      if (mainItem && branchItem) {
        if (!areListItemsEqual(mainItem, branchItem)) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Unable to merge item ${itemId} because it was created differently on both branches`,
          })
        }

        mergedById.set(itemId, structuredClone(mainItem))
        continue
      }

      if (mainItem) {
        mergedById.set(itemId, structuredClone(mainItem))
        continue
      }

      if (branchItem) {
        mergedById.set(itemId, structuredClone(branchItem))
      }

      continue
    }

    if (!mainItem && !branchItem) {
      continue
    }

    if (!mainItem && branchItem) {
      if (areListItemsEqual(branchItem, baseItem)) {
        continue
      }

      throw new TRPCError({
        code: 'CONFLICT',
        message: `Unable to merge item ${itemId} because main deleted it while the branch changed it`,
      })
    }

    if (mainItem && !branchItem) {
      if (areListItemsEqual(mainItem, baseItem)) {
        continue
      }

      throw new TRPCError({
        code: 'CONFLICT',
        message: `Unable to merge item ${itemId} because the branch deleted it while main changed it`,
      })
    }

    const resolvedMainItem = mainItem as ListItem
    const resolvedBranchItem = branchItem as ListItem

    if (areListItemsEqual(resolvedMainItem, resolvedBranchItem)) {
      mergedById.set(itemId, structuredClone(resolvedMainItem))
      continue
    }

    const mainChanged = !areListItemsEqual(resolvedMainItem, baseItem)
    const branchChanged = !areListItemsEqual(resolvedBranchItem, baseItem)

    if (!mainChanged && !branchChanged) {
      mergedById.set(itemId, structuredClone(baseItem))
      continue
    }

    if (!mainChanged) {
      mergedById.set(itemId, structuredClone(resolvedBranchItem))
      continue
    }

    if (!branchChanged) {
      mergedById.set(itemId, structuredClone(resolvedMainItem))
      continue
    }

    mergedById.set(itemId, mergeListItem(baseItem, resolvedMainItem, resolvedBranchItem))
  }

  const mergedSnapshot: ListSnapshot = []
  const addedItemIds = new Set<string>()

  const pushIfMerged = (item: ListItem | undefined) => {
    if (!item || addedItemIds.has(item.id)) {
      return
    }

    const mergedItem = mergedById.get(item.id)

    if (!mergedItem) {
      return
    }

    mergedSnapshot.push(structuredClone(mergedItem))
    addedItemIds.add(item.id)
  }

  for (const item of main) {
    pushIfMerged(item)
  }

  for (const item of branch) {
    pushIfMerged(item)
  }

  return mergedSnapshot
}

function buildRewriteDiff(fromSnapshot: ListSnapshot, toSnapshot: ListSnapshot): Diff {
  const changes: z.infer<typeof listPatchOperationSchema>[] = []

  for (let index = fromSnapshot.length - 1; index >= 0; index -= 1) {
    changes.push({
      op: 'remove',
      path: `/${index}`,
    })
  }

  for (let index = 0; index < toSnapshot.length; index += 1) {
    changes.push({
      op: 'add',
      path: `/${index}`,
      value: structuredClone(toSnapshot[index]),
    })
  }

  return diff.parse({ changes })
}

function applyListDiffToSnapshot(snapshot: ListSnapshot, listDiff: Diff): ListSnapshot {
  try {
    return jsonpatch.applyPatch(
      structuredClone(snapshot) as any,
      listDiff.changes as any,
    ).newDocument as ListSnapshot;
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unable to apply list diff',
    })
  }
}

export const ListRouter = createTRPCRouter({
  getLatestListData: protectedProcedure
    .input(z.object({
      listId: z.string(),
      branch: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.listId,
        },
        include: {
          user: true,
          collaborators: true,
        }
      })

      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      if (!(list.userId === ctx.user.id || list.collaborators.some((collaborator) => collaborator.id === ctx.user.id))) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const versioning = list.versionData
      const resolvedBranchName = input.branch ?? 'main'
      const selectedBranch = versioning.branches[resolvedBranchName]

      if (!selectedBranch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        })
      }

      return {
        ...list,
        items: structuredClone(selectedBranch.cachedSnapshot),
      }
    }),
  getBranchHistory: protectedProcedure
    .input(z.object({
      listId: z.string(),
      branch: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.listId,
        },
        include: {
          collaborators: true,
        }
      })

      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      if (!(list.userId === ctx.user.id || list.collaborators.some((collaborator) => collaborator.id === ctx.user.id))) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const versioning = list.versionData
      const resolvedBranchName = input.branch ?? 'main'
      const selectedBranch = versioning.branches[resolvedBranchName]

      if (!selectedBranch) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Branch ${resolvedBranchName} was not found`,
        })
      }
      const history: Array<z.infer<typeof branchHistoryEntrySchema>> = []

      let currentCommitId: string | null | undefined = selectedBranch.headCommitId

      while (currentCommitId) {
        const commit: VersionCommit | undefined = versioning.commits[currentCommitId]

        if (!commit) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Commit ${currentCommitId} was not found`,
          })
        }

        history.push(branchHistoryEntrySchema.parse({
          id: currentCommitId,
          parentId: commit.parentId,
          author: commit.author,
          message: commit.message,
          createdAt: commit.createdAt,
          diff: commit.diff,
        }))

        currentCommitId = commit.parentId ?? undefined
      }

      return {
        list: {
          ...list,
          items: structuredClone(selectedBranch.cachedSnapshot),
        },
        branch: branchSummarySchema.parse({
          name: resolvedBranchName,
          owner: selectedBranch.owner,
          baseCommitId: selectedBranch.baseCommitId,
          headCommitId: selectedBranch.headCommitId,
          parentBranch: selectedBranch.parentBranch,
          isPR: selectedBranch.isPR,
          PR: selectedBranch.PR,
        }),
        history: history.reverse(),
      }
    }),
  getRecentLists: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: ctx.user.id }
      })
      const recentItems = user?.recentItems as z.infer<typeof RecentItemsSchema> | undefined;
      return recentItems?.filter(item => item.type === "list") ?? [];
    }),
  commitToList: protectedProcedure
    .input(z.object({
      id: z.string(),
      commitMessage: z.string(),
      baseCommitId: z.string(),
      diff,
      branch: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranchOrThrow(versioning, input.branch)

      if (!hasBranchAccess(list, currentBranch, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const headCommitId = currentBranch.headCommitId

      if (!headCommitId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        })
      }

      if (headCommitId !== input.baseCommitId) {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const headCommit = versioning.commits[headCommitId]

      if (!headCommit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        })
      }

      const branchSnapshot = currentBranch.cachedSnapshot
      const nextSnapshot = applyListDiffToSnapshot(branchSnapshot, input.diff)
      const newCommitId = generateCommitHash(input.diff)

      const updatedItems = !currentBranch.parentBranch ? structuredClone(nextSnapshot) : list.items
      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          [input.branch]: {
            ...currentBranch,
            headCommitId: newCommitId,
            cachedSnapshot: nextSnapshot,
          }
        },
        commits: {
          ...versioning.commits,
          [newCommitId]: {
            parentId: headCommitId,
            author: ctx.user.id,
            message: input.commitMessage,
            createdAt: new Date().toISOString(),
            diff: input.diff
          }
        }
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
          items: updatedItems,
        }
      })
      return 'OK'
    }),
  createBranch: protectedProcedure
    .input(z.object({
      id: z.string(),
      newBranchName: z.string(),
      baseBranchName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const baseBranch = getBranchOrThrow(versioning, input.baseBranchName)

      // PS: no auth checks, anyone should be able to create a pr / suggest new items

      if (versioning.branches[input.newBranchName]) {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          [input.newBranchName]: {
            baseCommitId: baseBranch.headCommitId,
            headCommitId: baseBranch.headCommitId,
            parentBranch: input.baseBranchName,
            isPR: false,
            cachedSnapshot: structuredClone(baseBranch.cachedSnapshot),
            owner: ctx.user.id,
          }
        }
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
        }
      })
      return 'OK'
    }),
  createList: protectedProcedure
    .input(z.object({
      name: z.string(),
      subject: z.enum(SubjectNamesArray),
      diff
    }))
    .mutation(async ({ ctx, input }) => {
      const initialItems = applyListDiffToSnapshot([], input.diff)
      const initialCommitId = generateCommitHash(input.diff)
      const newList = await ctx.prisma.list.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          subject: input.subject,
          userId: ctx.user.id,
          items: structuredClone(initialItems),
          versionData: {
            branches: {
              main: {
                owner: ctx.user.id,
                baseCommitId: initialCommitId,
                headCommitId: initialCommitId,
                isPR: false,
                cachedSnapshot: structuredClone(initialItems),
              }
            },
            commits: {
              [initialCommitId]: {
                parentId: null,
                author: ctx.user.id,
                message: 'Initial commit',
                createdAt: new Date().toISOString(),
                diff: input.diff
              }
            }
          }
        }
        ,
        include: {
          collaborators: true,
        }
      })
      return listRecordSchema.parse(newList)
    }),
  createPullRequest: protectedProcedure
    .input(z.object({
      id: z.string(),
      branch: z.string(),
      title: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranchOrThrow(versioning, input.branch)

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Pull requests can only be created from branches cloned from main',
        })
      }

      if (!hasBranchAccess(list, currentBranch, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (currentBranch.PR?.status === 'open' || currentBranch.isPR) {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          [input.branch]: {
            ...currentBranch,
            isPR: true,
            PR: {
              title: input.title,
              description: input.description,
              status: 'open' as const,
            },
          }
        }
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
        }
      })
      return 'OK'
    }),
  closePullRequest: protectedProcedure
    .input(z.object({
      id: z.string(),
      branch: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranchOrThrow(versioning, input.branch)

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Pull requests can only be closed for branches cloned from main',
        })
      }

      if (!hasBranchAccess(list, currentBranch, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (currentBranch.PR?.status !== 'open') {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          [input.branch]: {
            ...currentBranch,
            isPR: true,
            PR: {
              ...currentBranch.PR,
              status: 'closed' as const,
            },
          }
        }
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
        }
      })
      return 'OK'
    }),
  reopenPullRequest: protectedProcedure
    .input(z.object({
      id: z.string(),
      branch: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranchOrThrow(versioning, input.branch)

      if (!hasBranchAccess(list, currentBranch, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Pull requests can only be reopened for branches cloned from main',
        })
      }

      if (currentBranch.PR?.status !== 'closed') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Pull requests can only be reopened after they are closed',
        })
      }

      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          [input.branch]: {
            ...currentBranch,
            isPR: true,
            PR: {
              ...currentBranch.PR,
              status: 'open' as const,
            },
          }
        }
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
        }
      })
      return 'OK'
    }),
  mergePullRequest: protectedProcedure
    .input(z.object({
      id: z.string(),
      branch: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      if (list.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const versioning = list.versionData
      const mainBranch = getBranchOrThrow(versioning, 'main')
      const currentBranch = getBranchOrThrow(versioning, input.branch)

      if (input.branch === 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The main branch cannot be merged into itself',
        })
      }

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only branches cloned from main can be merged into main',
        })
      }

      if (currentBranch.PR?.status !== 'open') {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const baseSnapshot = getCommitSnapshot(versioning, currentBranch.baseCommitId)
      const mainSnapshot = structuredClone(mainBranch.cachedSnapshot)
      const branchSnapshot = structuredClone(currentBranch.cachedSnapshot)
      const mergedSnapshot = mergeSnapshots(baseSnapshot, mainSnapshot, branchSnapshot)
      const shouldCreateMergeCommit = JSON.stringify(mainSnapshot) !== JSON.stringify(mergedSnapshot)

      const mergeDiff = shouldCreateMergeCommit
        ? buildRewriteDiff(mainSnapshot, mergedSnapshot)
        : null

      const mergeCommitId = mergeDiff
        ? generateCommitHash(mergeDiff)
        : null

      const newHistory = {
        ...versioning,
        branches: {
          ...versioning.branches,
          main: shouldCreateMergeCommit && mergeCommitId
            ? {
              ...mainBranch,
              headCommitId: mergeCommitId,
              cachedSnapshot: mergedSnapshot,
            }
            : {
              ...mainBranch,
              cachedSnapshot: mergedSnapshot,
            },
          [input.branch]: {
            ...currentBranch,
            isPR: true,
            PR: {
              ...currentBranch.PR,
              status: 'merged' as const,
            },
          },
        },
        commits: mergeDiff && mergeCommitId
          ? {
            ...versioning.commits,
            [mergeCommitId]: {
              parentId: mainBranch.headCommitId,
              author: ctx.user.id,
              message: `Merge branch ${input.branch} into main`,
              createdAt: new Date().toISOString(),
              diff: mergeDiff,
            },
          }
          : versioning.commits,
      }

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          versionData: newHistory,
          items: mergedSnapshot,
        }
      })
      return 'OK'
    }),
  updateListMeta: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      subject: z.enum(SubjectNamesArray).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.name && !input.description && !input.subject) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
        })
      }
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      if (list.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const updatedList = await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        include: {
          collaborators: true,
        },
        data: {
          name: input.name ?? list.name,
          description: input.description ?? list.description,
          subject: input.subject ?? list.subject,
        }
      })
      return listRecordSchema.parse(updatedList)
    })
})