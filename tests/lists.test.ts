import { beforeEach, describe, expect, it, vi } from "vitest"
import { appRouter } from "~/server/main"
import { createCallerFactory } from "~/server/trpc"

const mocks = vi.hoisted(() => {
  const lists = new Map<string, any>()

  const prisma = {
    list: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const record = lists.get(where.id)
        return record ? structuredClone(record) : null
      }),
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          subject: data.subject,
          userId: data.userId,
          items: structuredClone(data.items),
          versionData: structuredClone(data.versionData),
          collaborators: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        lists.set(record.id, record)
        return structuredClone(record)
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }, data: any }) => {
        const existing = lists.get(where.id)

        if (!existing) {
          throw new Error(`Missing list ${where.id}`)
        }

        const updated = {
          ...existing,
          ...data,
          name: data.name ?? existing.name,
          description: data.description ?? existing.description,
          subject: data.subject ?? existing.subject,
          items: data.items ?? existing.items,
          versionData: data.versionData ?? existing.versionData,
        }

        lists.set(where.id, updated)
        return structuredClone(updated)
      }),
    },
    user: {
      findFirst: vi.fn(async () => null),
    },
  }

  return { lists, prisma }
})

vi.mock("~/lib/db", () => ({
  prisma: mocks.prisma,
}))

vi.mock("~/lib/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}))

const createCaller = createCallerFactory(appRouter)

const initialItem = {
  id: "item-a",
  question: "Question A",
  answer: "Answer A",
} as const

const branchItem = {
  id: "item-b",
  question: "Question B",
  answer: "Answer B",
} as const

function createAuthedCaller(userId = "user-1") {
  return createCaller({
    prisma: mocks.prisma as any,
    user: { id: userId },
  } as any)
}

function buildInitialDiff() {
  return {
    changes: [
      {
        op: "add" as const,
        path: "/0",
        value: structuredClone(initialItem),
      },
    ],
  }
}

function buildAnswerReplaceDiff(value: string) {
  return {
    changes: [
      {
        op: "replace" as const,
        path: "/0/answer",
        value,
      },
    ],
  }
}

function buildMainAddDiff() {
  return {
    changes: [
      {
        op: "add" as const,
        path: "/1",
        value: structuredClone(branchItem),
      },
    ],
  }
}

beforeEach(() => {
  mocks.lists.clear()
  vi.clearAllMocks()
})

describe("list PR lifecycle", () => {
  it("reopens only closed pull requests and preserves metadata", async () => {
    const caller = createAuthedCaller()
    const list = await caller.list.createList({
      name: "Revision list",
      subject: "biology",
      diff: buildInitialDiff(),
    })

    await caller.list.createBranch({
      id: list.id,
      newBranchName: "feature/reopen",
      baseBranchName: "main",
    })

    await caller.list.createPullRequest({
      id: list.id,
      branch: "feature/reopen",
      title: "Feature branch",
      description: "Initial PR",
    })

    await expect(caller.list.reopenPullRequest({
      id: list.id,
      branch: "feature/reopen",
    })).rejects.toMatchObject({ code: "CONFLICT" })

    await caller.list.closePullRequest({
      id: list.id,
      branch: "feature/reopen",
    })

    await caller.list.reopenPullRequest({
      id: list.id,
      branch: "feature/reopen",
    })

    const branchState = await caller.list.getBranchHistory({
      listId: list.id,
      branch: "feature/reopen",
    })

    expect(branchState.branch.PR).toMatchObject({
      title: "Feature branch",
      description: "Initial PR",
      status: "open",
    })
  })

  it("merges a stale branch with a 3-way merge", async () => {
    const caller = createAuthedCaller()
    const list = await caller.list.createList({
      name: "Mergeable list",
      subject: "biology",
      diff: buildInitialDiff(),
    })

    const baseCommitId = list.versionData.branches.main.headCommitId

    await caller.list.createBranch({
      id: list.id,
      newBranchName: "feature/3way",
      baseBranchName: "main",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "feature/3way",
      baseCommitId,
      commitMessage: "Update the answer on the branch",
      diff: buildAnswerReplaceDiff("Branch answer"),
    })

    await caller.list.createPullRequest({
      id: list.id,
      branch: "feature/3way",
      title: "Branch merge",
      description: "Merge the branch work",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "main",
      baseCommitId,
      commitMessage: "Main line grows the list",
      diff: buildMainAddDiff(),
    })

    const beforeMergeMain = await caller.list.getLatestListData({
      listId: list.id,
      branch: "main",
    })

    await caller.list.mergePullRequest({
      id: list.id,
      branch: "feature/3way",
    })

    const afterMergeMain = await caller.list.getLatestListData({
      listId: list.id,
      branch: "main",
    })

    expect(afterMergeMain.items).toEqual([
      {
        id: "item-a",
        question: "Question A",
        answer: "Branch answer",
      },
      {
        id: "item-b",
        question: "Question B",
        answer: "Answer B",
      },
    ])

    expect(afterMergeMain.versionData.branches.main.headCommitId).not.toBe(beforeMergeMain.versionData.branches.main.headCommitId)

    const branchState = await caller.list.getBranchHistory({
      listId: list.id,
      branch: "feature/3way",
    })

    expect(branchState.branch.PR).toMatchObject({
      title: "Branch merge",
      description: "Merge the branch work",
      status: "merged",
    })

    await expect(caller.list.reopenPullRequest({
      id: list.id,
      branch: "feature/3way",
    })).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("merges independent field edits on the same item", async () => {
    const caller = createAuthedCaller()
    const list = await caller.list.createList({
      name: "Field merge list",
      subject: "biology",
      diff: buildInitialDiff(),
    })

    const baseCommitId = list.versionData.branches.main.headCommitId

    await caller.list.createBranch({
      id: list.id,
      newBranchName: "feature/field-merge",
      baseBranchName: "main",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "feature/field-merge",
      baseCommitId,
      commitMessage: "Branch updates the answer",
      diff: buildAnswerReplaceDiff("Branch answer"),
    })

    await caller.list.createPullRequest({
      id: list.id,
      branch: "feature/field-merge",
      title: "Field merge",
      description: "Branch and main edit different fields",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "main",
      baseCommitId,
      commitMessage: "Main updates the question",
      diff: {
        changes: [
          {
            op: "replace" as const,
            path: "/0/question",
            value: "Main question",
          },
        ],
      },
    })

    await caller.list.mergePullRequest({
      id: list.id,
      branch: "feature/field-merge",
    })

    const mergedMain = await caller.list.getLatestListData({
      listId: list.id,
      branch: "main",
    })

    expect(mergedMain.items).toEqual([
      {
        id: "item-a",
        question: "Main question",
        answer: "Branch answer",
      },
    ])
  })

  it("rejects conflicting edits on the same item", async () => {
    const caller = createAuthedCaller()
    const list = await caller.list.createList({
      name: "Conflict list",
      subject: "biology",
      diff: buildInitialDiff(),
    })

    const baseCommitId = list.versionData.branches.main.headCommitId

    await caller.list.createBranch({
      id: list.id,
      newBranchName: "feature/conflict",
      baseBranchName: "main",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "feature/conflict",
      baseCommitId,
      commitMessage: "Branch changes the answer",
      diff: buildAnswerReplaceDiff("Branch answer"),
    })

    await caller.list.createPullRequest({
      id: list.id,
      branch: "feature/conflict",
      title: "Conflicting branch",
      description: "Will conflict",
    })

    await caller.list.commitToList({
      id: list.id,
      branch: "main",
      baseCommitId,
      commitMessage: "Main changes the answer too",
      diff: buildAnswerReplaceDiff("Main answer"),
    })

    await expect(caller.list.mergePullRequest({
      id: list.id,
      branch: "feature/conflict",
    })).rejects.toMatchObject({ code: "CONFLICT" })
  })
})