import { useRouteLoaderData, useNavigate } from "react-router"
import { List } from "lucide-react"
import { subjects as subjectsList } from "~/lib/subjects"
import i18n, { t } from "~/i18n"

export default function ListsPage() {
  const loaderData = useRouteLoaderData("../routes/app/group/layout")
  const navigate = useNavigate()

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
                {new Date(list.updatedAt).toLocaleDateString('nl-NL')}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}