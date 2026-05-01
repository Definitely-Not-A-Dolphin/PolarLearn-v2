// import { useTRPC } from "~/server/react";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";

import type { Route } from "./+types/words";
import { appRouter } from "~/server/main";
import { Outlet, useLoaderData, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { Button, Tabs } from "@polarnl/polarui-react";
import { Subject } from "~/lib/subjects";
import i18n from "~/i18n";
import { prisma } from "~/lib/db";
import { Pencil } from "lucide-react";

interface RootData {
  theme: "light" | "dark";
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const id = params.id as string | undefined;
  if (!id) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("", { status: 400 });
  }
  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });

  if (!context.user) {
    return new Response("", { status: 401 });
  }
  const userId = context.user.id;
  const caller = createCallerFactory(appRouter)(context);
  try {
    const list = await caller.list.getLatestListData({ listId: id });
    const canEdit = list.userId === userId || list.collaborators.some((collaborator) => collaborator.id === userId);

    const collaborators = []
    for (const collaborator of list.collaborators) {
      const collaboratorId = typeof collaborator === 'string' ? collaborator : collaborator.id
      const user = await prisma.user.findUnique({
        where: {
          id: collaboratorId
        }
      });
      if (user) {
        collaborators.push({ name: user.name || "?", id: user.id });
      }
    }

    return { list, collaborators, canEdit };
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response(error as string, { status: 500 });
  }
}

export default function Layout() {
  const data = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootData>("root");
  const subjects = new Subject();
  const icon = subjects.getIcon(data.list.subject, { width: 50, height: 50 })
  const t = i18n.t
  const location = useLocation();
  const navigate = useNavigate();
  const theme: "light" | "dark" = rootData?.theme ?? "dark";
   
  return (
    <div className="p-4">
      <div className="flex flex-row items-center gap-3">
        {icon}
        <h1 className="text-4xl font-bold">{data.list.name}</h1>
      </div>
      {/* <p>{data.list.description}</p> implement later */}
      <p className="mt-4">
        {t("lists.madeBy")}
        {data.collaborators.map((collaborator, index) => (
          <span key={collaborator.id}>
            {index > 0 && ", "}
            <button
              type="button"
              onClick={() => { void navigate(`/app/viewuser/${collaborator.id}`); }}
              className="font-bold text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
            >
              {collaborator.name}
            </button>
          </span>
        ))}
      </p>

      <div className="mt-4">
        <Tabs
          scheme={theme}
          tabs={[t("lists.words") || "Words", t("lists.stats") || "Stats"]}
          activeIndex={(() => {
            const p = location.pathname.replace(/\/+$/, "");
            if (p.endsWith(`/app/viewlist/${data.list.id}/stats`)) return 1;
            return 0;
          })()}
          onActiveIndexChange={(idx: number) => {
            if (idx === 0) {
              void navigate(`/app/viewlist/${data.list.id}/words`);
            } else if (idx === 1) {
              void navigate(`/app/viewlist/${data.list.id}/stats`);
            }
          }}
        />
      </div>
      <div className="py-4 flex flex-row gap-4">
        {data.canEdit && (
          <Button
            scheme={theme}
            variant="transparent"
            icon={<Pencil />}
            onClick={() => {
              void navigate(`/app/editlist/${data.list.id}`);
            }}
          >
            {t("lists.edit.title")}
          </Button>
        )}
      </div>
      <hr className="mb-4" />
      <Outlet />
    </div>
  )
}