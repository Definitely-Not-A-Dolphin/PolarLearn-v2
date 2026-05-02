import { Button, Input } from "@polarnl/polarui-react";
import { Check, ChevronDown } from "lucide-react";
import { useRouteLoaderData } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { fullCategories, type CreatePostInput } from "~/lib/forum";
import SubjectSelector from "~/components/subject-selector";
import { Subject } from "~/lib/subjects";
import { SubjectNamesArray, type SubjectNames } from "~/lib/subjectnames";
import { t } from "~/i18n";
import { useTRPC } from "~/server/react";
import { useState } from "react";

export function CreatePostDialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rootData = useRouteLoaderData<{ theme: "light" | "dark"; user?: { role: string } }>("root");
  const theme = rootData?.theme ?? "light";
  const isAdmin = rootData?.user?.role === "admin";
  const rpc = useTRPC();

  type CategoryId = CreatePostInput["category"];
  const availableCategories: CategoryId[] = isAdmin
    ? ["school-related", "non-school-related", "announcement"]
    : ["school-related", "non-school-related"];

  const subjects = new Subject();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectNames>(SubjectNamesArray[0]);
  const [category, setCategory] = useState<CategoryId>(availableCategories[0]);
  const [body, setBody] = useState("");
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const SelectedCategoryIcon = fullCategories[category].icon;

  const createPostMutation = useMutation({
    ...rpc.forum.createPost.mutationOptions(),
    onSuccess: () => {
      toast.success(t("forum.post.created"));
      setTitle("");
      setBody("");
      setSubject(SubjectNamesArray[0]);
      setCategory(availableCategories[0]);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("forum.post.error"));
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t("forum.post.titleRequired"));
      return;
    }
    if (!body.trim()) {
      toast.error(t("forum.post.contentRequired"));
      return;
    }

    createPostMutation.mutate({
      title: title.trim(),
      content: body.trim(),
      subject: category === "school-related" ? subject : undefined,
      category,
    });
  };

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Nieuwe post</DialogTitle>
        </DialogHeader>

        <div>
          <label htmlFor="new-post-title" className="font-medium">Titel</label>
          <Input
            id="new-post-title"
            placeholder="Titel"
            scheme={theme}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="mt-2"
            disabled={createPostMutation.isPending}
          />
        </div>

        <div className="mt-4">
          <p className="font-medium">Categorie</p>
          <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                disabled={createPostMutation.isPending}
              >
                <span className="flex items-center gap-2">
                  <SelectedCategoryIcon className="size-4" />
                  {t(fullCategories[category].label)}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start" portalled={false}>
              <div className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Kies een categorie
              </div>
              <div className="grid gap-1">
                {availableCategories.map((categoryId) => {
                  const isSelected = categoryId === category;
                  const CategoryIcon = fullCategories[categoryId].icon;

                  return (
                    <button
                      key={categoryId}
                      type="button"
                      className={
                        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted" +
                        (isSelected ? " bg-muted font-medium" : "")
                      }
                      onClick={() => {
                        setCategory(categoryId);
                        setIsCategoryPopoverOpen(false);
                      }}
                      disabled={createPostMutation.isPending}
                    >
                      <span className="flex items-center gap-2">
                        <CategoryIcon className="size-4" />
                        {t(fullCategories[categoryId].label)}
                      </span>
                      {isSelected ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {category === "school-related" && (
          <div className="mt-4">
            <p className="font-medium">Vak</p>
            <div className="mt-2">
              <SubjectSelector
                selected={subject}
                onSelect={(id) => {
                  setSubject(id);
                }}
                open={isSubjectSelectorOpen}
                onOpenChange={setIsSubjectSelectorOpen}
                subjects={subjects}
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="new-post-body" className="font-medium">Inhoud</label>
          <textarea
            id="new-post-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
            }}
            className="mt-2 w-full min-h-30 rounded-md border border-border bg-background p-2 text-sm text-foreground disabled:opacity-50"
            disabled={createPostMutation.isPending}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="transparent" scheme={theme} disabled={createPostMutation.isPending}>Annuleren</Button>
          </DialogClose>
          <Button
            color="sky"
            textColor="white"
            onClick={handleSubmit}
            disabled={createPostMutation.isPending}
          >
            {createPostMutation.isPending ? "Bezig..." : "Posten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}