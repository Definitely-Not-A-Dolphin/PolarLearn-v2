import { useNavigate, useRouteLoaderData } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

export default function ViewUserGroupsPage() {
  const loaderData = useRouteLoaderData("../routes/app/viewuser/layout") as {
    user: {
      createdGroups: {
        id: string;
        name: string;
        image: string | null;
        members: { id: string }[];
      }[];
    };
  };
  const navigate = useNavigate();
  const groups = loaderData?.user.createdGroups ?? [];

  return (
    <div className="flex flex-col gap-4">
      {groups.length === 0 ? (
        <p>This user has not created any groups yet.</p>
      ) : (
        <>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className="grid h-15 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl bg-neutral-200 px-4 py-3 text-left transition-all hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              onClick={() => {
                void navigate(`/app/group/${group.id}`);
              }}
            >
              <span className="flex min-w-0 items-center gap-x-3">
                <Avatar size="sm">
                  <AvatarImage
                    src={group.image ?? undefined}
                    alt={group.name}
                  />
                  <AvatarFallback>
                    {group.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-base font-semibold">
                  {group.name}
                </span>
              </span>

              <span className="justify-self-end whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">
                {group.members.length}{" "}
                {group.members.length === 1 ? "member" : "members"}
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
