import { redirect, useLoaderData } from "react-router";
import { createCallerFactory, createTRPCContext } from "~/server/trpc";
import { appRouter } from "~/server/main";
import i18n from "~/i18n";
import type { Route } from "./+types/words";

type LoaderData = {
  list: {
    items: { id: string; question: string; answer: string }[];
  };
}

export async function loader({ params, request }: Route.LoaderArgs): Promise<LoaderData> {
  const id = params.id;

  if (!id) {
    throw new Response("", { status: 400 });
  }

  const headers = new Headers(request.headers);
  const context = await createTRPCContext({ headers });

  if (!context.user) {
    const url = new URL(request.url);
    return redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  const caller = createCallerFactory(appRouter)(context);
  const list = await caller.list.getLatestListData({ listId: id });

  return { list };
}

export default function WordsPage() {
  const t = i18n.t
  const { list } = useLoaderData<typeof loader>();

  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/80 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-neutral-50 text-sm font-semibold text-neutral-900 dark:bg-white/5 dark:text-neutral-200">
              <th className="w-1/2 px-8 py-4">{t("lists.create.keyInputPlaceholder")}</th>
              <th className="w-1/2 px-8 py-4">{t("lists.create.valueInputPlaceholder")}</th>
            </tr>
          </thead>
          <tbody>
            {list.items.length > 0 ? (
              list.items.map((item: { id: string; question: string; answer: string }) => (
                <tr
                  key={item.id}
                  className="border-t border-neutral-200 text-[15px] leading-6 text-neutral-900 odd:bg-neutral-50 even:bg-transparent dark:border-neutral-800/80 dark:text-neutral-100 dark:odd:bg-white/5 dark:even:bg-transparent"
                >
                  <td className="px-8 py-4 align-middle font-medium text-neutral-900 dark:text-neutral-100">
                    <span className="block truncate">{item.question}</span>
                  </td>
                  <td className="px-8 py-4 align-middle text-neutral-700 dark:text-neutral-300">
                    <span className="block truncate">{item.answer}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-neutral-200 dark:border-neutral-800/80">
                <td className="px-8 py-10 text-sm text-neutral-500 dark:text-neutral-400" colSpan={2}>
                  Nog geen woorden toegevoegd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}