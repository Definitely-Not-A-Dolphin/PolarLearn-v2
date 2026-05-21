import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import crypto from "crypto";
import jsonpatch, { type Operation } from "fast-json-patch";
import { SubjectNamesArray } from "~/lib/subjectnames";
import { listSnapshot, type ListItem, type ListSnapshot } from "~/lib/list";
import { buildListDiff, listDiffSchema, listPatchOperationSchema, snapshotFromEditableItems, type ListDiff } from "~/lib/list-diff";
import { TRPCError } from "@trpc/server";
import { t } from "~/i18n";
import { RecentListsSchema, extractRecentItems, RecentSubjectsSchema } from "~/lib/list";

export { listPatchOperationSchema };

function generateCommitHash(diff: Diff): string {
  return crypto.createHash("sha256")
    .update(JSON.stringify(diff) +
      crypto.randomBytes(32).toString("hex")
      /* random data so hash is unique, no conflicts */)
    .digest("hex");
}

const pullRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['open', 'closed', 'merged'])
})

const branchRecordSchema = z.object({
  owner: z.string(),
  baseCommitId: z.string(),
  headCommitId: z.string(),
  parentBranch: z.string().optional(),
  isPR: z.boolean().optional(),
  PR: pullRequestSchema.optional(),
  cachedSnapshot: listSnapshot,
})

export const branch = z.record(z.string(), branchRecordSchema)

export const diff = z.object({
  changes: listDiffSchema.shape.changes.min(1),
})

export type Diff = ListDiff

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

const listRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  subject: z.enum(SubjectNamesArray),
  userId: z.string(),
  items: listSnapshot,
  versionData,
  collaborators: z.array(z.object({ id: z.string() })),
  favoritedBy: z.array(z.object({ id: z.string() })),
}).loose()

type VersionCommit = z.infer<typeof versionCommitSchema>
type VersionData = z.infer<typeof versionData>
type BranchRecord = z.infer<typeof branchRecordSchema>
type ListRecord = z.infer<typeof listRecordSchema>

const listRecordInclude = {
  collaborators: true,
  favoritedBy: {
    select: { id: true },
  },
} as const

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

function getBranch(versioning: VersionData, branchName: string): BranchRecord {
  const selectedBranch = versioning.branches[branchName]

  if (!(branchName in versioning.branches)) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: t('lists.branches.notFound', { branchName }),
    })
  }

  return selectedBranch
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
            message: t('lists.merge.conflictBothCreatedDifferently', { itemId }),
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
        message: t('lists.merge.conflictMainDeletedBranchChanged', { itemId }),
      })
    }

    if (mainItem && !branchItem) {
      if (areListItemsEqual(mainItem, baseItem)) {
        continue
      }

      throw new TRPCError({
        code: 'CONFLICT',
        message: t('lists.merge.conflictBranchDeletedMainChanged', { itemId }),
      })
    }

    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const resolvedMainItem = mainItem as ListItem
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
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

    const mergedItem = structuredClone(baseItem)

    for (const field of ['question', 'answer'] as const) {
      const baseValue = baseItem[field]
      const mainValue = resolvedMainItem[field]
      const branchValue = resolvedBranchItem[field]

      if (Object.is(mainValue, branchValue)) {
        mergedItem[field] = mainValue
        continue
      }

      const mainChanged = !Object.is(mainValue, baseValue)
      const branchChanged = !Object.is(branchValue, baseValue)

      if (mainChanged && branchChanged) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: t('lists.merge.conflictBothChangedField', { itemId: baseItem.id, field }),
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

    mergedById.set(itemId, mergedItem)
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

function constructNewRecentLists(
  existing: z.infer<typeof RecentListsSchema>,
  newEntry: z.infer<typeof RecentListsSchema>[number]
): z.infer<typeof RecentListsSchema> {
  const filtered = existing.filter((item) => item.id !== newEntry.id)
  return [newEntry, ...filtered]
}

function constructNewRecentSubjects(
  existing: z.infer<typeof RecentSubjectsSchema>,
  newEntry: z.infer<typeof RecentSubjectsSchema>[number]
): z.infer<typeof RecentSubjectsSchema> {
  const filtered = existing.filter((subject) => subject !== newEntry)
  return [newEntry, ...filtered]
}

function applyListDiffToSnapshot(snapshot: ListSnapshot, listDiff: Diff): ListSnapshot {
  try {
    const result = jsonpatch.applyPatch(
      structuredClone(snapshot),
      listDiff.changes as Operation[],
    );
    return snapshotFromEditableItems(listSnapshot.parse(result.newDocument));
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: t('lists.diff.cannotApply'),
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
          ...listRecordInclude,
        }
      })

      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const resolvedBranchName = input.branch ?? 'main'
      const selectedBranch = versioning.branches[resolvedBranchName]

      if (!(resolvedBranchName in versioning.branches)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        })
      }

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { recentItems: true },
      })

      const { recent_lists: existingRecentLists, recent_subjects: existingRecentSubjects } = extractRecentItems(user?.recentItems)

      const newRecentLists = constructNewRecentLists(existingRecentLists, {
        id: list.id,
        updatedAt: new Date().toISOString(),
      })

      const shouldUpdateRecentItems =
        existingRecentLists[0]?.id !== list.id ||
        existingRecentSubjects[0] !== list.subject

      if (shouldUpdateRecentItems) {
        void ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            recentItems: {
              recent_subjects: constructNewRecentSubjects(existingRecentSubjects, list.subject),
              recent_lists: newRecentLists,
            },
          },
        }).catch(() => {})
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
        include: listRecordInclude,
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

      if (!(resolvedBranchName in versioning.branches)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: t('lists.branches.notFound', { branchName: resolvedBranchName }),
        })
      }
      const history: (z.infer<typeof versionCommitSchema> & { id: string })[] = []

      let currentCommitId: string | null | undefined = selectedBranch.headCommitId

      while (currentCommitId) {
        const commit: VersionCommit | undefined = versioning.commits[currentCommitId]

        if (!(currentCommitId in versioning.commits)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: t('lists.commits.notFound', { commitId: currentCommitId }),
          })
        }

        history.push(z.object({
          id: z.string(),
          parentId: z.string().nullish(),
          author: z.string(),
          message: z.string(),
          createdAt: z.string(),
          diff,
        }).parse({
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
        branch: z.object({
          name: z.string(),
          owner: z.string(),
          baseCommitId: z.string(),
          headCommitId: z.string(),
          parentBranch: z.string().optional(),
          isPR: z.boolean().optional(),
          PR: pullRequestSchema.optional(),
        }).parse({
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
  getRecentItems: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: ctx.user.id }
      })

      const { recent_lists: lists, recent_subjects: recentSubjects } = extractRecentItems(user?.recentItems)

      const seen = new Set<string>()
      const deduped = [...lists].reverse().filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })

      const rawLists = await ctx.prisma.list.findMany({
        where: {
          id: {
            in: deduped.map((item) => item.id),
          },
        },
        include: {
          user: true,
          ...listRecordInclude,
        },
      })

      const rawListsById = new Map(rawLists.map((list) => [list.id, list]))
      const hydratedLists = deduped.map((item) => {
        const rawList = rawListsById.get(item.id)

        return rawList ? listRecordSchema.parse(rawList) : null
      })

      const missingListIds = new Set(
        deduped
          .filter((item) => !rawListsById.has(item.id))
          .map((item) => item.id),
      )

      if (missingListIds.size > 0) {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            recentItems: {
              recent_subjects: recentSubjects,
              recent_lists: lists.filter((item) => !missingListIds.has(item.id)),
            },
          },
        })
      }

      const seenSubjects = new Set<string>()
      const dedupedSubjects = [...recentSubjects].reverse().filter((subject) => {
        if (seenSubjects.has(subject)) return false
        seenSubjects.add(subject)
        return true
      })

      return {
        recent_lists: hydratedLists.filter((list): list is NonNullable<typeof list> => Boolean(list)),
        recent_subjects: dedupedSubjects,
      }
    }),
  getRecentLists: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: ctx.user.id }
      })

      const { recent_lists: lists, recent_subjects: recentSubjects } = extractRecentItems(user?.recentItems)

      const seen = new Set<string>()
      const deduped = [...lists].reverse().filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })

      const rawLists = await ctx.prisma.list.findMany({
        where: {
          id: {
            in: deduped.map((item) => item.id),
          },
        },
        include: {
          user: true,
          ...listRecordInclude,
        },
      })

      const rawListsById = new Map(rawLists.map((list) => [list.id, list]))
      const hydratedLists = deduped.map((item) => {
        const rawList = rawListsById.get(item.id)

        return rawList ? listRecordSchema.parse(rawList) : null
      })

      const missingListIds = new Set(
        deduped
          .filter((item) => !rawListsById.has(item.id))
          .map((item) => item.id),
      )

      if (missingListIds.size > 0) {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            recentItems: {
              recent_subjects: recentSubjects,
              recent_lists: lists.filter((item) => !missingListIds.has(item.id)),
            },
          },
        })
      }

      return hydratedLists.filter((list): list is NonNullable<typeof list> => Boolean(list))
    }),
  rmListFromRecent: protectedProcedure
    .input(z.object({
      listId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { recentItems: true },
      })

      const { recent_lists: existingRecentLists, recent_subjects: existingRecentSubjects } = extractRecentItems(user?.recentItems)

      const newRecentLists = existingRecentLists.filter((list) => list.id !== input.listId)

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          recentItems: {
            recent_subjects: existingRecentSubjects,
            recent_lists: newRecentLists,
          },
        },
      })
      return 'OK'
    }),
  deleteList: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        select: {
          userId: true,
        },
      })

      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (rawList.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      await ctx.prisma.list.delete({
        where: {
          id: input.id,
        },
      })

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { recentItems: true },
      })

      const { recent_lists: existingRecentLists, recent_subjects: existingRecentSubjects } = extractRecentItems(user?.recentItems)

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          recentItems: {
            recent_subjects: existingRecentSubjects,
            recent_lists: existingRecentLists.filter((list) => list.id !== input.id),
          },
        },
      })

      return 'OK'
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranch(versioning, input.branch)

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


      if (!(headCommitId in versioning.commits)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
        })
      }

      const branchSnapshot = snapshotFromEditableItems(currentBranch.cachedSnapshot)
      const nextSnapshot = applyListDiffToSnapshot(branchSnapshot, input.diff)
      const sanitizedDiff = buildListDiff(branchSnapshot, nextSnapshot)

      if (sanitizedDiff.changes.length === 0 && JSON.stringify(branchSnapshot) === JSON.stringify(nextSnapshot)) {
        return 'OK'
      }

      const commitDiff = diff.parse(sanitizedDiff.changes.length > 0 ? sanitizedDiff : input.diff)
      const newCommitId = generateCommitHash(commitDiff)

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
            diff: commitDiff
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

      await ctx.prisma.learnSession.deleteMany({
        where: { listId: input.id },
      })

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { recentItems: true },
      })

      const { recent_lists: existingRecentLists, recent_subjects: existingRecentSubjects } = extractRecentItems(user?.recentItems)

      const newRecentLists = constructNewRecentLists(existingRecentLists, {
        id: list.id,
        updatedAt: new Date().toISOString(),
      })

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          recentItems: {
            recent_subjects: [...existingRecentSubjects, list.subject],
            recent_lists: newRecentLists,
          },
        },
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const baseBranch = getBranch(versioning, input.baseBranchName)

      // PS: no auth checks, anyone should be able to create a pr / suggest new items

      if (input.newBranchName in versioning.branches) {
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
    }))
    .mutation(async ({ ctx, input }) => {
      const diff = {
        changes: [
          {
            op: 'add',
            path: '/0',
            value: {
              id: crypto.randomUUID(),
              question: '',
              answer: '',
            }
          },
          {
            op: 'remove',
            path: '/0',
          }
        ],
      } as Diff
      const initialItems = applyListDiffToSnapshot([], diff)
      const initialCommitId = generateCommitHash(diff)
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
                message: t('lists.commits.initial'),
                createdAt: new Date().toISOString(),
                diff: diff
              }
            }
          },
          collaborators: {
            connect: { id: ctx.user.id }
          }
        },
        include: listRecordInclude,
      })

      const parsedList = listRecordSchema.parse(newList)

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { recentItems: true },
      })

      const { recent_lists: existingRecentLists, recent_subjects: existingRecentSubjects } = extractRecentItems(user?.recentItems)

      const newRecentLists = constructNewRecentLists(existingRecentLists, {
        id: parsedList.id,
        updatedAt: new Date().toISOString(),
      })

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          recentItems: {
            recent_subjects: [...existingRecentSubjects, parsedList.subject],
            recent_lists: newRecentLists,
          },
        },
      })
      return parsedList
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranch(versioning, input.branch)

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: t('lists.branches.prOnlyFromMain'),
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranch(versioning, input.branch)

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: t('lists.branches.prCloseOnlyFromMain'),
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      const versioning = list.versionData
      const currentBranch = getBranch(versioning, input.branch)

      if (!hasBranchAccess(list, currentBranch, ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: t('lists.branches.prReopenOnlyFromMain'),
        })
      }

      if (currentBranch.PR?.status !== 'closed') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: t('lists.branches.prReopenRequiresClosed'),
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
        include: listRecordInclude,
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const list = listRecordSchema.parse(rawList)

      if (list.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const versioning = list.versionData
      const currentBranch = getBranch(versioning, input.branch)
      const mainBranch = getBranch(versioning, 'main')

      if (input.branch === 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: t('lists.branches.cannotMergeMainIntoItself'),
        })
      }

      if (currentBranch.parentBranch !== 'main') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: t('lists.branches.onlyMainClonesCanMerge'),
        })
      }

      if (currentBranch.PR?.status !== 'open') {
        throw new TRPCError({
          code: 'CONFLICT',
        })
      }

      const commitsInOrder: VersionCommit[] = []
      let currentCommitId: string | null | undefined = currentBranch.baseCommitId

      while (currentCommitId) {
        const commit: VersionCommit | undefined = versioning.commits[currentCommitId]

        if (!(currentCommitId in versioning.commits)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: t('lists.commits.notFound', { commitId: currentCommitId }),
          })
        }

        commitsInOrder.push(commit)
        currentCommitId = commit.parentId ?? undefined
      }

      const baseSnapshot = commitsInOrder
        .reverse()
        .reduce<ListSnapshot>((snapshot, commit) => applyListDiffToSnapshot(snapshot, commit.diff), [])
      const mainSnapshot = structuredClone(mainBranch.cachedSnapshot)
      const branchSnapshot = structuredClone(currentBranch.cachedSnapshot)
      const mergedSnapshot = mergeSnapshots(baseSnapshot, mainSnapshot, branchSnapshot)
      const shouldCreateMergeCommit = JSON.stringify(mainSnapshot) !== JSON.stringify(mergedSnapshot)

      const mergeDiff = shouldCreateMergeCommit
        ? (() => {
          const changes: z.infer<typeof listPatchOperationSchema>[] = []

          for (let index = mainSnapshot.length - 1; index >= 0; index -= 1) {
            changes.push({
              op: 'remove',
              path: `/${index.toString()}`,
            })
          }

          for (let index = 0; index < mergedSnapshot.length; index += 1) {
            changes.push({
              op: 'add',
              path: `/${index.toString()}`,
              value: structuredClone(mergedSnapshot[index]),
            })
          }

          return diff.parse({ changes })
        })()
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
              message: t('lists.commits.merge', { branch: input.branch }),
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

      // Sessions must be cleared after a merge which changes the list items,
      // otherwise clients may resume an invalid session state.
      await ctx.prisma.learnSession.deleteMany({
        where: { listId: input.id },
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
        include: listRecordInclude,
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
        include: listRecordInclude,
        data: {
          name: input.name ?? list.name,
          description: input.description ?? list.description,
          subject: input.subject ?? list.subject,
        }
      })
      return listRecordSchema.parse(updatedList)
    }),
  starList: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rawList = await ctx.prisma.list.findFirst({
        where: {
          id: input.id,
        },
        include: {
          favoritedBy: {
            select: { id: true },
          },
        }
      })
      if (!rawList) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      const hasFavorited = rawList.favoritedBy.some((user) => user.id === ctx.user.id)

      await ctx.prisma.list.update({
        where: {
          id: input.id,
        },
        data: {
          favoritedBy: {
            [hasFavorited ? 'disconnect' : 'connect']: { id: ctx.user.id },
          },
        }
      })
      return 'OK'
    }),
})
