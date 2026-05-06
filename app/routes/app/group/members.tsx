import { useNavigate, useRevalidator, useRouteLoaderData } from "react-router"
import { useMutation } from "@tanstack/react-query"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "@polarnl/polarui-react"
import { Loader2 } from "lucide-react"
import { Badge } from "~/components/ui/badge"
import { useTRPC } from "~/server/react"
import { toast } from "sonner"
import { t } from "~/i18n"

export default function MembersPage() {
  const loaderData = useRouteLoaderData("../routes/app/group/layout")
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const trpc = useTRPC()

  const members: any[] = loaderData.group?.members ?? []
  const pendingMembers: any[] = loaderData.group?.approvalQueue ?? []
  const moderators: string[] = (loaderData.group?.moderators ?? []).map((m: any) => m.id)
  const ownerId: string | undefined = loaderData.group?.creatorId
  const isOwner = Boolean(loaderData.ownsGroup)

  const approveMutation = useMutation({
    ...trpc.groups.approveGroupMember.mutationOptions(),
    onSuccess: () => {
      toast.success(t("groups.memberApproved"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    },
  })

  const rejectMutation = useMutation({
    ...trpc.groups.rejectGroupMember.mutationOptions(),
    onSuccess: () => {
      toast.success(t("groups.memberRejected"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    },
  })

  const toggleModeratorMutation = useMutation({
    ...trpc.groups.toggleGroupModerator.mutationOptions(),
    onSuccess: (result) => {
      toast.success(result === "UNPROMOTED" ? t("groups.moderatorUnpromoted") : t("groups.moderatorPromoted"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    },
  })

  const kickMemberMutation = useMutation({
    ...trpc.groups.kickGroupMember.mutationOptions(),
    onSuccess: () => {
      toast.success(t("groups.memberKicked"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    },
  })

  const hasPendingMembers = isOwner && pendingMembers.length > 0
  const hasMembers = members.length > 0

  if (!hasPendingMembers && !hasMembers) {
    return (
      <div className="rounded-xl bg-neutral-100 px-5 py-4 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        {t("groups.noMembers") /* fallback will show key if missing */}
      </div>
    )
  }

  return (
    <>
      <h1 className="font-bold text-2xl mb-4">{t("groups.members")}</h1>
      <div className="w-full flex flex-col gap-y-3">
        {hasPendingMembers ? (
          <div className="flex flex-col gap-y-3">
            <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">{t("groups.pendingMembers")}</h2>
            {pendingMembers.map((member: any) => {
              return (
                <div
                  key={member.id}
                  role="button"
                  tabIndex={0}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-amber-100 px-4 py-3 transition-all dark:bg-amber-950/40"
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
                      <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-amber-500 text-white">{t("groups.pending")}</Badge>
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      color="green"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      icon={approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                      onClick={(event) => {
                        event.stopPropagation()
                        approveMutation.mutate({ groupId: loaderData.group.id, userId: member.id })
                      }}
                    >
                      {t("groups.approve")}
                    </Button>
                    <Button
                      color="red"
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      icon={rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                      onClick={(event) => {
                        event.stopPropagation()
                        rejectMutation.mutate({ groupId: loaderData.group.id, userId: member.id })
                      }}
                    >
                      {t("groups.reject")}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
        {hasMembers ? (
          <div className="flex flex-col gap-y-3">
            {hasPendingMembers ? <h2 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">{t("groups.allMembers")}</h2> : null}
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
                        <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-amber-500 text-white">{t("groups.owner")}</Badge>
                      ) : isModerator ? (
                        <Badge variant="outline" className="h-auto rounded px-2 py-1 text-xs font-semibold bg-blue-500 text-white">{t("groups.moderator")}</Badge>
                      ) : null}
                    </span>
                  </button>
                  {loaderData.ownsGroup && !isOwner ? (
                    <div className="flex items-center gap-2">
                      <Button
                        color={isModerator ? "orange" : "green"}
                        disabled={toggleModeratorMutation.isPending || kickMemberMutation.isPending}
                        icon={toggleModeratorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleModeratorMutation.mutate({ groupId: loaderData.group.id, userId: member.id })
                        }}
                      >
                        {isModerator ? t("groups.unpromoteModerator") : t("groups.promoteModerator")}
                      </Button>
                      <Button
                        color="red"
                        disabled={toggleModeratorMutation.isPending || kickMemberMutation.isPending}
                        icon={kickMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                        onClick={(event) => {
                          event.stopPropagation()
                          kickMemberMutation.mutate({ groupId: loaderData.group.id, userId: member.id })
                        }}
                      >
                        {t("groups.kickFromGroup")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </>
  )
}