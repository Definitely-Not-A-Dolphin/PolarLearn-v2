import { beforeEach, describe, expect, it, vi } from "vitest"
import { appRouter } from "~/server/main"
import { createCallerFactory } from "~/server/trpc"

const mocks = vi.hoisted(() => {
  const posts = new Map<string, any>()

  const prisma = {
    forumPost: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const record = posts.get(where.id)
        return record ? structuredClone(record) : null
      }),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }: { data: any }) => {
        const record = {
          id: data.id,
          title: data.title,
          content: data.content,
          category: data.category,
          subject: data.subject ?? null,
          votes: data.votes ?? 0,
          authorId: data.author?.connect?.id ?? data.authorId ?? null,
          cachedTotalVotes: data.cachedTotalVotes ?? 0,
          voters: structuredClone(data.voters),
          deleted: data.deleted ?? false,
          isReply: data.isReply ?? false,
          replyToId: data.replyToId ?? null,
          associatedQuiz: data.associatedQuiz ?? null,
          associatedList: data.associatedList ?? null,
          associatedBranch: data.associatedBranch ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        posts.set(record.id, record)
        return structuredClone(record)
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }, data: any }) => {
        const existing = posts.get(where.id)

        if (!existing) {
          throw new Error(`Missing post ${where.id}`)
        }

        const updated = {
          ...existing,
          ...data,
          title: data.title ?? existing.title,
          content: data.content ?? existing.content,
          category: data.category ?? existing.category,
          subject: data.subject ?? existing.subject,
          votes: data.votes ?? existing.votes,
          cachedTotalVotes: data.cachedTotalVotes ?? existing.cachedTotalVotes,
          voters: data.voters ?? existing.voters,
          deleted: data.deleted ?? existing.deleted,
        }

        posts.set(where.id, updated)
        return structuredClone(updated)
      }),
    },
    user: {
      findFirst: vi.fn(async () => null),
    },
  }

  return { posts, prisma }
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

function createAuthedCaller(userId = "user-1") {
  return createCaller({
    prisma: mocks.prisma as any,
    user: { id: userId },
  } as any)
}

function seedPost(overrides: Record<string, any> = {}) {
  const post = {
    id: "post-1",
    title: "Forum post",
    content: "Hello forum",
    category: "announcement",
    subject: null,
    votes: 0,
    authorId: "author-1",
    cachedTotalVotes: 0,
    voters: {},
    deleted: false,
    isReply: false,
    replyToId: null,
    associatedQuiz: null,
    associatedList: null,
    associatedBranch: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }

  mocks.posts.set(post.id, post)
  return post
}

beforeEach(() => {
  mocks.posts.clear()
  vi.clearAllMocks()
})

describe("forum voting", () => {
  it("creates posts with an empty vote map", async () => {
    const caller = createAuthedCaller()

    const post = await caller.forum.createPost({
      title: "Welcome",
      content: "Hello forum",
      category: "announcement",
    })

    expect(post).toMatchObject({
      title: "Welcome",
      content: "Hello forum",
      category: "announcement",
      subject: null,
      votes: 0,
      cachedTotalVotes: 0,
      voters: {},
      authorId: "user-1",
    })
  })

  it("adds, flips, and removes a vote for the same user", async () => {
    const caller = createAuthedCaller()
    seedPost()

    const firstVote = await caller.forum.votePost({
      id: "post-1",
      vote: "up",
    })

    expect(firstVote).toMatchObject({
      voters: {
        "user-1": "up",
      },
      votes: 1,
      cachedTotalVotes: 1,
    })

    const flipped = await caller.forum.votePost({
      id: "post-1",
      vote: "down",
    })

    expect(flipped).toMatchObject({
      voters: {
        "user-1": "down",
      },
      votes: -1,
      cachedTotalVotes: 1,
    })

    const cleared = await caller.forum.votePost({
      id: "post-1",
      vote: "down",
    })

    expect(cleared).toMatchObject({
      voters: {},
      votes: 0,
      cachedTotalVotes: 0,
    })
  })

  it("removes an upvote when the same user upvotes again", async () => {
    const caller = createAuthedCaller()
    seedPost()

    const firstVote = await caller.forum.votePost({
      id: "post-1",
      vote: "up",
    })

    expect(firstVote).toMatchObject({
      voters: {
        "user-1": "up",
      },
      votes: 1,
      cachedTotalVotes: 1,
    })

    const removedVote = await caller.forum.votePost({
      id: "post-1",
      vote: "up",
    })

    expect(removedVote).toMatchObject({
      voters: {},
      votes: 0,
      cachedTotalVotes: 0,
    })
  })

  it("returns not found for deleted posts", async () => {
    const caller = createAuthedCaller()
    seedPost({ deleted: true })

    await expect(caller.forum.votePost({
      id: "post-1",
      vote: "up",
    })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})