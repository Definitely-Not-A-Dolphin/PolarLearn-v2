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

import { useRouteLoaderData, useNavigate, useRevalidator } from "react-router"
import { List, ListX } from "lucide-react"
import { subjects as subjectsList } from "~/lib/subjects"
import { t } from "~/i18n"
import { useMutation } from "@tanstack/react-query"
import { useTRPC } from "~/server/react"
import { toast } from "sonner"

export default function ListsPage() {
  const loaderData = useRouteLoaderData("../routes/app/group/layout")
  const navigate = useNavigate()
  const trpc = useTRPC()
  const canRemove = Boolean(loaderData.ownsGroup || loaderData.isModerator)
  const revalidator = useRevalidator()

  const removeMutation = useMutation({
    ...trpc.groups.removeListFromGroup.mutationOptions(),
    onSuccess: async () => {
      toast.success(t("groups.listRemovedFromGroup"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    }
  })

  return (
    <div className="w-full flex flex-col gap-y-3">
      {!loaderData.group.lists || loaderData.group.lists.length === 0 ? (
        <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {t("home.noRecentLists")}
        </div>
      ) : (
        loaderData.group.lists.map((list: any) => {
          const hasSubject = typeof list.subject === "string"
            && Object.prototype.hasOwnProperty.call(subjectsList, list.subject)
          const subject = hasSubject
            ? subjectsList[list.subject as keyof typeof subjectsList]
            : null
          const subjectLabel = subject ? t(subject.labelKey) : null

          return (
            <div
              key={list.id}
              role="button"
              tabIndex={0}
              className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 hover:bg-neutral-300 px-4 py-3 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
              onClick={() => { void navigate(`/app/viewlist/${list.id}`); }}
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-x-3 text-left"
              >
                {subject ? (
                  <img src={subject.icon} alt={subjectLabel ?? ""} className="h-6 w-6 shrink-0" />
                ) : (
                  <List size={20} className="shrink-0" />
                )}
                <span className="truncate text-base font-semibold">
                  {list.name ?? t("lists.namePlaceholder")}
                </span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigate(`/app/viewuser/${list.user.id}`);
                }}
                className="justify-self-center font-bold truncate text-sm text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
              >
                {list.user.name ?? list.user.id}
              </button>

              <span className="shrink-0 text-sm text-neutral-600 dark:text-neutral-300">
                {canRemove ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeMutation.mutate({ groupId: loaderData.group.id, listId: list.id })
                    }}
                    className="h-10 w-10 bg-neutral-300 dark:bg-neutral-700 hover:dark:bg-neutral-600 text-red-400 rounded-full items-center justify-center flex transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ListX />
                  </button>
                ) : (
                  new Date(list.updatedAt).toLocaleDateString('nl-NL')
                )}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}