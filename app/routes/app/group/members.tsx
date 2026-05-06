import { useNavigate, useRouteLoaderData } from "react-router"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import i18n, { t } from "~/i18n"

export default function MembersPage() {
  const loaderData = useRouteLoaderData("../routes/app/group/layout")
  const navigate = useNavigate()

  const members: any[] = loaderData.group?.members ?? []
  const moderators: string[] = (loaderData.group?.moderators ?? []).map((m: any) => m.id)
  const ownerId: string | undefined = loaderData.group?.creatorId

  if (!members || members.length === 0) {
    return (
      <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        {t("groups.noMembers") /* fallback will show key if missing */}
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-y-3">
      {members.map((member: any) => {
        const isOwner = ownerId === member.id
        const isModerator = moderators.includes(member.id)

        return (
          <div
            key={member.id}
            role="button"
            tabIndex={0}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 hover:bg-neutral-300 px-4 py-3 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            onClick={() => { void navigate(`/app/viewuser/${member.id}`); }}
          >
            <button
              type="button"
              className="flex min-w-0 items-center gap-x-3 text-left"
            >
              <Avatar size="sm">
                <AvatarImage src={member.image ?? undefined} alt={member.name ?? member.id} />
                <AvatarFallback>{(member.name ?? member.id).slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate text-base font-semibold flex items-center gap-x-2">
                <span className="truncate">{member.name ?? member.id}</span>
                {isOwner ? (
                  <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-amber-500 text-white">{t("groups.owner") || "owner"}</Badge>
                ) : isModerator ? (
                    <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-blue-500 text-white">{t("groups.moderator") || "mod"}</Badge>
                ) : null}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}