import { createCallerFactory, createTRPCContext } from '~/server/trpc';
import type { Route } from './+types/groups'
import { appRouter } from "~/server/main";
import { useLoaderData } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });
  const caller = createCallerFactory(appRouter)(context);

  try {
    const groups = await caller.groups.getJoinedGroups();
    return { groups };
  }
  catch (error) {
    console.error("Error fetching groups:", error);
    throw new Response("Failed to load groups", { status: 500 });
  }
}

export default function GroupsPage() {
  const { groups } = useLoaderData()
  return (
    <div>
      {JSON.stringify(groups)}
    </div>
  )
}