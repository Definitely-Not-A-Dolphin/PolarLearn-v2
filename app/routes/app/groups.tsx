// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { createCallerFactory, createTRPCContext } from '~/server/trpc';
import type { Route } from './+types/groups'
import { appRouter } from "~/server/main";
import { useLoaderData, useNavigate } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers, request });
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
  const navigate = useNavigate()
  return (
    <div className='p-4 flex flex-col gap-4'>
      {groups.length === 0 ? (
        <p>You have not joined any groups yet.</p>
      ) : (
        <>
          {groups.map((group: any) => (
            <button
              key={group.id}
              type="button"
              className="grid w-full h-15 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 px-4 py-3 text-left transition-all hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={() => { void navigate(`/app/group/${group.id}`); }}
            >
              <span className="flex min-w-0 items-center gap-x-3">
                <Avatar size="sm">
                  <AvatarImage src={group.avatarUrl ?? undefined} alt={group.name} />
                  <AvatarFallback>{group.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate text-base font-semibold">{group.name}</span>
              </span>

              <span className="justify-self-end whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}