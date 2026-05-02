import { Outlet, useLocation, useNavigate, useRouteLoaderData } from "react-router";
import { Tabs } from "@polarnl/polarui-react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreatePostDialog } from "./CreatePostDialog";

interface RootData {
  theme: "light" | "dark";
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootData = useRouteLoaderData<RootData>("root");
  const theme: "light" | "dark" = rootData?.theme ?? "dark";

  // Determine active tab based on current path
  const getActiveIndex = () => {
    const path = location.pathname.replace(/\/+$/, "");
    if (path.includes("/myPosts")) return 1;
    if (path.includes("/myReplies")) return 2;
    return 0; // Default to "All Posts" (posts page)
  };

  const handleTabChange = (idx: number) => {
    if (idx === 0) {
      void navigate("/app/forum/posts");
    } else if (idx === 1) {
      void navigate("/app/forum/myPosts");
    } else if (idx === 2) {
      void navigate("/app/forum/myReplies");
    }
  };

  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="flex flex-row items-center">
        <CreatePostDialog open={createPostDialogOpen} onOpenChange={setCreatePostDialogOpen} />
        <Tabs
          scheme={theme}
          tabs={["All Posts", "My Posts", "My Replies"]}
          activeIndex={getActiveIndex()}
          onActiveIndexChange={handleTabChange}
        />
        <div className="grow" />
        <button
          className="h-10 w-10 bg-neutral-800 hover:bg-neutral-700 rounded-full items-center justify-center flex cursor-pointer"
          onClick={() => {
            setCreatePostDialogOpen(true)
          }}
        >
          <Plus />
        </button>
      </div>
      <hr />
      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
}
