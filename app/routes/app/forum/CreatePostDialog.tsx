import { useRouteLoaderData, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostDialog } from "./PostDialog";
import { defaultForumCategory, forumCategoryRequiresSubject, type ForumCategory } from "~/lib/forum";
import { Subject } from "~/lib/subjects";
import { SubjectNamesArray, type SubjectNames } from "~/lib/subjectnames";
import { t } from "~/i18n";
import { useTRPC } from "~/server/react";
import { useState } from "react";
import type { RootLoaderData } from "~/lib/root-data";

type CreatePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePostDialog({
  open,
  onOpenChange,
}: CreatePostDialogProps) {
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "light";
  const isAdmin = rootData?.user.role === "admin";
  const rpc = useTRPC();

  const subjects = new Subject();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectNames>(SubjectNamesArray[0]);
  const [category, setCategory] = useState<ForumCategory>(defaultForumCategory);
  const [body, setBody] = useState("");
  const [isSubjectSelectorOpen, setIsSubjectSelectorOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const navigate = useNavigate();

  const createPostMutation = useMutation({
    ...rpc.forum.createPost.mutationOptions(),
    onSuccess: (data) => {
      toast.success(t("forum.post.created"));
      setTitle("");
      setBody("");
      setSubject(SubjectNamesArray[0]);
      setCategory(defaultForumCategory);
      onOpenChange(false);
      void navigate(`/app/forum/posts/${data.id}`)
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
      subject: forumCategoryRequiresSubject(category) ? subject : undefined,
      category,
    });
  };

  return (
    <PostDialog
      isEdit={false}
      open={open}
      onOpenChange={onOpenChange}
      theme={theme}
      title={title}
      content={body}
      setTitle={setTitle}
      setContent={setBody}
      category={category}
      setCategory={setCategory}
      subject={subject}
      setSubject={setSubject}
      isSubjectSelectorOpen={isSubjectSelectorOpen}
      setIsSubjectSelectorOpen={setIsSubjectSelectorOpen}
      isCategoryPopoverOpen={isCategoryPopoverOpen}
      setIsCategoryPopoverOpen={setIsCategoryPopoverOpen}
      isPending={createPostMutation.isPending}
      onSubmit={handleSubmit}
      subjects={subjects}
      isAdmin={isAdmin}
    />
  );
}
