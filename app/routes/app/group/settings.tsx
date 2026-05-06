import { Input, Button, CheckWithLabel } from "@polarnl/polarui-react";
import { useState } from "react";
import { useRouteLoaderData, useRevalidator } from "react-router";
import { useTRPC } from "~/server/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "~/i18n";
import { Loader2, Save, X } from "lucide-react";

export default function SettingsPage() {
  const loaderData = useRouteLoaderData("../routes/app/group/layout")
  const rootData = useRouteLoaderData("root")
  const trpc = useTRPC()
  const revalidator = useRevalidator()
  const t = i18n.t
  const theme = rootData?.theme ?? "dark"

  const [groupName, setGroupName] = useState(loaderData.group.name)
  const [groupDescription, setGroupDescription] = useState(loaderData.group.description ?? "")
  const [approvalRequired, setApprovalRequired] = useState(loaderData.group.approvalRequired ?? false)
  const [onlyModsCanAddLists, setOnlyModsCanAddLists] = useState(loaderData.group.onlyModsCanAddLists ?? false)

  const updateMutation = useMutation({
    ...trpc.groups.updateGroup.mutationOptions(),
    onSuccess: async () => {
      toast.success(t("groups.update.success"))
      revalidator.revalidate()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("errors.unknown"))
    }
  })

  const hasChanges =
    groupName.trim() !== (loaderData.group.name ?? "").trim() ||
    (groupDescription ?? "").trim() !== (loaderData.group.description ?? "").trim() ||
    approvalRequired !== (loaderData.group.approvalRequired ?? false) ||
    onlyModsCanAddLists !== (loaderData.group.onlyModsCanAddLists ?? false)

  return (
    <div className="w-full flex flex-col gap-y-4 p-4">
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t("groups.create.nameLabel")}
          </label>
          <Input
            scheme={theme}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t("groups.create.namePlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {t("groups.create.descriptionLabel")}
          </label>
          <Input
            scheme={theme}
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder={t("groups.create.descriptionPlaceholder")}
          />
        </div>

        <div className="rounded-xl border border-neutral-300/80 dark:border-neutral-700 p-4 space-y-4 bg-neutral-50/70 dark:bg-neutral-900/40 mt-2">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {t("groups.create.settingsTitle")}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("groups.create.settingsDescription")}
            </p>
          </div>

          <div className="space-y-1">
            <CheckWithLabel
              label={t("groups.create.approvalRequiredLabel")}
              checked={approvalRequired}
              onChange={() => setApprovalRequired((prev: any) => !prev)}
              className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
            />
            <p className="ml-6 text-sm text-neutral-500 dark:text-neutral-400">
              {t("groups.create.approvalRequiredDescription")}
            </p>
          </div>

          <div className="space-y-1">
            <CheckWithLabel
              label={t("groups.create.onlyModsCanAddListsLabel")}
              checked={onlyModsCanAddLists}
              onChange={() => setOnlyModsCanAddLists((prev: any) => !prev)}
              className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
            />
            <p className="ml-6 text-sm text-neutral-500 dark:text-neutral-400">
              {t("groups.create.onlyModsCanAddListsDescription")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-x-3 justify-end pt-4">
        <Button
          variant="transparent"
          scheme={theme}
          onClick={() => {
            setGroupName(loaderData.group.name)
            setGroupDescription(loaderData.group.description ?? "")
            setApprovalRequired(loaderData.group.approvalRequired ?? false)
            setOnlyModsCanAddLists(loaderData.group.onlyModsCanAddLists ?? false)
          }}
          disabled={updateMutation.isPending}
          icon={<X />}
        >
          {t("common.cancel")}
        </Button>
        <Button
          scheme={theme}
          onClick={() => {
            updateMutation.mutate({
              id: loaderData.group.id,
              name: groupName.trim(),
              description: groupDescription.trim() || undefined,
              approvalRequired,
              onlyModsCanAddLists,
            })
          }}
          disabled={updateMutation.isPending || !groupName.trim() || groupName.trim().length < 3 || !hasChanges}
          icon={updateMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        >
          {updateMutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  )
}