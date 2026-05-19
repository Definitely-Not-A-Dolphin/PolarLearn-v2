import { useState, type FormEvent } from "react";
import { Download, Loader2, Save, Trash2 } from "lucide-react";
import { CheckWithLabel, Button } from "@polarnl/polarui-react";
import {
  redirect,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
  useNavigate,
} from "react-router";
import { toast } from "sonner";

import i18n from "~/i18n";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { authClient } from "~/lib/auth/client";
import { auth } from "~/lib/auth/server";
import { exportAccountAction } from "~/lib/export";
import { prisma } from "~/lib/db";
import { themeSchema, type Theme, type RootLoaderData } from "~/lib/root-data";
import type { Route } from "./+types/usersettings";

const EXPORT_COOLDOWN = 7 * 24 * 60 * 60 * 1000;


export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(request.headers);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    const url = new URL(request.url);
    return redirect(`/auth/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true, optinAI: true, lastExportedAt: true },
  });

  return {
    theme: themeSchema.parse(user?.theme ?? "dark"),
    aiFeatures: user?.optinAI ?? false,
    lastExportedAt: user?.lastExportedAt?.toISOString() ?? null,
    nextExportAvailableAt: user?.lastExportedAt
      ? new Date(user.lastExportedAt.getTime() + EXPORT_COOLDOWN).toISOString()
      : null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers(request.headers);
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    const url = new URL(request.url);
    return redirect(`/auth/sign-in?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  const formData = await request.formData();
  const themeResult = themeSchema.safeParse(formData.get("theme"));
  const aiFeatures = formData.get("aiFeatures") === "true";

  if (!themeResult.success) {
    return new Response("Invalid theme", { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      theme: themeResult.data,
      optinAI: aiFeatures,
    },
  });

  return redirect("/app/usersettings");
}

export default function UserSettings() {
  const loaderData = useLoaderData<typeof loader>();
  const savedTheme = loaderData?.theme ?? "dark";
  const savedAiFeatures = loaderData?.aiFeatures ?? false;
  const initialNextExportAvailableAt = loaderData?.nextExportAvailableAt ?? null;
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const navigation = useNavigation();
  const navigate = useNavigate();
  const t = i18n.t;
  const scheme = rootData?.theme ?? "dark";

  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [aiFeatures, setAiFeatures] = useState(savedAiFeatures);
  const [nextExportAvailableAt, setNextExportAvailableAt] = useState<string | null>(initialNextExportAvailableAt);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isPending = navigation.state !== "idle";
  const themeHasChanges = theme !== savedTheme;
  const aiHasChanges = aiFeatures !== savedAiFeatures;
  const exportAvailableAt = nextExportAvailableAt ? new Date(nextExportAvailableAt) : null;
  const canExport = !exportAvailableAt || exportAvailableAt <= new Date();
  const exportAvailableLabel = exportAvailableAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(exportAvailableAt)
    : null;

  const handleExportAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isExporting || !canExport) {
      return;
    }

    setIsExporting(true);

    try {
      const result = await exportAccountAction();

      if (!result.ok) {
        if (result.error === "EXPORT_COOLDOWN") {
          const availableAt = result.availableAt;
          if (availableAt) {
            setNextExportAvailableAt(availableAt);
          }

          toast.error(t("userSettings.export.cooldownError", {
            date: availableAt
              ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(availableAt))
              : exportAvailableLabel ?? "",
          }));
          return;
        }

        toast.error(t("userSettings.export.error"));
        return;
      }

      if (!result.content || !result.filename) {
        toast.error(t("userSettings.export.error"));
        return;
      }

      const content = result.content;
      const filename = result.filename ?? `polarlearn-account-export-${new Date().toISOString().slice(0, 10)}.json`;

      const blob = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNextExportAvailableAt(result.nextExportAvailableAt ?? new Date(Date.now() + EXPORT_COOLDOWN).toISOString());
      toast.success(t("userSettings.export.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("userSettings.export.error"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const result = (await authClient.deleteUser()) as unknown;

      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        (result as { error?: { message?: string } | null }).error
      ) {
        toast.error(
          (result as { error?: { message?: string } | null }).error?.message ??
          t("userSettings.delete.error"),
        );
        return;
      }

      setIsDeleteDialogOpen(false);
      navigate("/auth/sign-in", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("userSettings.delete.error"),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-2xl space-y-4">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("userSettings.description")}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="settings" />
              <input type="hidden" name="theme" value={theme} />
              <input type="hidden" name="aiFeatures" value={aiFeatures ? "true" : "false"} />

              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t("userSettings.theme.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("userSettings.theme.description")}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-300/80 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <CheckWithLabel
                  label={theme === "dark" ? t("userSettings.theme.dark") : t("userSettings.theme.light")}
                  checked={theme === "dark"}
                  onChange={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                  className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  scheme={scheme}
                  type="submit"
                  disabled={isPending || !themeHasChanges}
                  icon={isPending ? <Loader2 className="animate-spin" /> : <Save />}
                >
                  {isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </form>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="settings" />
              <input type="hidden" name="theme" value={theme} />
              <input type="hidden" name="aiFeatures" value={aiFeatures ? "true" : "false"} />

              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t("userSettings.ai.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("userSettings.ai.description")}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-300/80 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
                <CheckWithLabel
                  label={t("userSettings.ai.label")}
                  checked={aiFeatures}
                  onChange={() => setAiFeatures((current) => !current)}
                  className="[&>span:last-child]:text-neutral-900! dark:[&>span:last-child]:text-neutral-100!"
                />
                <p className="ml-6 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {aiFeatures ? t("userSettings.ai.enabled") : t("userSettings.ai.disabled")}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  scheme={scheme}
                  type="submit"
                  disabled={isPending || !aiHasChanges}
                  icon={isPending ? <Loader2 className="animate-spin" /> : <Save />}
                >
                  {isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </form>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <form method="post" className="space-y-4" onSubmit={handleExportAccount}>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t("userSettings.export.title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("userSettings.export.description")}
                </p>
                {!canExport && exportAvailableLabel ? (
                  <p className="text-sm text-muted-foreground">
                    {t("userSettings.export.cooldown", { date: exportAvailableLabel })}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  scheme={scheme}
                  type="submit"
                  disabled={isPending || isExporting || !canExport}
                  icon={isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                >
                  {isExporting ? t("userSettings.export.exporting") : t("userSettings.export.button")}
                </Button>
              </div>
            </form>
          </div>
          <div className="space-y-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
                {t("userSettings.delete.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("userSettings.delete.description")}
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                scheme={scheme}
                type="button"
                color="red"
                textColor="white"
                disabled={isPending || isDeleting}
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  setIsDeleteDialogOpen(true);
                }}
              >
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-700 dark:text-red-300">
              {t("userSettings.delete.title")}
            </DialogTitle>
            <DialogDescription>
              {t("userSettings.delete.warning")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="transparent" scheme={scheme} disabled={isDeleting}>
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              scheme={scheme}
              type="button"
              color="red"
              textColor="white"
              disabled={isDeleting}
              icon={isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              onClick={() => {
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? t("common.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
