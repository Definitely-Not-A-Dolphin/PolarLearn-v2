import { useNavigate, useRouteLoaderData } from "react-router";
import { List } from "lucide-react";
import { subjects as subjectsList } from "~/lib/subjects";
import i18n from "~/i18n";

export default function ViewUserListsPage() {
  const loaderData = useRouteLoaderData("../routes/app/viewuser/layout") as {
    user: {
      id: string;
      displayUsername: string | null;
      username: string | null;
      name: string | null;
      lists: {
        id: string;
        name: string | null;
        subject: string | null;
        updatedAt: string | Date;
      }[];
    };
  };
  const navigate = useNavigate();
  const t = i18n.t;
  const lists = loaderData?.user.lists ?? [];

  return (
    <div className="flex w-full flex-col gap-y-3">
      {lists.length === 0 ? (
        <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {t("home.noRecentLists")}
        </div>
      ) : (
        lists.map((list) => {
          const hasSubject =
            typeof list.subject === "string" &&
            Object.prototype.hasOwnProperty.call(subjectsList, list.subject);
          const subject = hasSubject
            ? subjectsList[list.subject as keyof typeof subjectsList]
            : null;
          const subjectLabel = subject ? t(subject.labelKey) : null;

          return (
            <div
              key={list.id}
              role="button"
              tabIndex={0}
              className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 px-4 py-3 transition-all hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 cursor-pointer"
              onClick={() => {
                void navigate(`/app/viewlist/${list.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void navigate(`/app/viewlist/${list.id}`);
                }
              }}
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-x-3 text-left"
              >
                {subject ? (
                  <img
                    src={subject.icon}
                    alt={subjectLabel ?? ""}
                    className="h-6 w-6 shrink-0"
                  />
                ) : (
                  <List size={20} className="shrink-0" />
                )}
                <span className="truncate text-base font-semibold">
                  {list.name ?? t("lists.namePlaceholder")}
                </span>
              </button>

              <span className="shrink-0 flex flex-row items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
                {new Date(list.updatedAt).toLocaleDateString("nl-NL")}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
