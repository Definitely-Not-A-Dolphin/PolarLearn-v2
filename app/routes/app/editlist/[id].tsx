import { useLoaderData, type LoaderFunctionArgs } from "react-router"
import { createCallerFactory } from "~/server/trpc"
import { appRouter } from "~/server/main"
import { createTRPCContext } from "~/server/trpc"

const createCaller = createCallerFactory(appRouter)

export async function loader({ request, params }: LoaderFunctionArgs) {
  if (!params.id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Missing list id", { status: 400 })
  }

  const url = new URL(request.url)
  const branch = url.searchParams.get("branch") ?? undefined
  const headers = new Headers(request.headers)
  const caller = createCaller(await createTRPCContext({ headers }))
  const list = await caller.list.getLatestListData({
    listId: params.id,
    branch,
  })

  return {
    list,
    branch,
  }
}

export default function EditListPage() {
  const { list, branch } = useLoaderData<typeof loader>();

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{list.name}</h1>
        <p className="text-sm text-neutral-500">
          {branch ? `Branch: ${branch}` : "Default list view"}
        </p>
      </div>

      <pre className="rounded-xl bg-neutral-100 dark:bg-neutral-800 p-4 text-sm overflow-auto">
        {JSON.stringify(list.items, null, 2)}
      </pre>
    </div>
  )
}