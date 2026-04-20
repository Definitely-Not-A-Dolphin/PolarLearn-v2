import { auth } from "~/lib/auth/server";
import { redirect, useNavigate } from "react-router";
import i18n from "~/i18n";
import { Folder, List, Star } from "lucide-react";

export async function loader(loaderArgs: { request: Request }) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (!user) {
    return redirect('/home')
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const t = i18n.t;
  return (
    <div className="flex flex-col p-4">
      <h1 className="font-bold text-3xl">{t("navigation.quickstart")}</h1>
      <div className="flex flex-row gap-x-4 mt-4">
        <div
          className="flex flex-col gap-y-2 p-2 h-50 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer"
          onClick={() => navigate("/app/lists")}
        >
          <Star size={48} />
          <h1 className="font-bold">Mijn favorieten</h1>
        </div>
        <div
          className="flex flex-col gap-y-2 p-2 h-50 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer"
          onClick={() => navigate("/app/lists")}
        >
          <List size={48} />
          <h1 className="font-bold">Mijn lijsten</h1>
        </div>
        <div
          className="flex flex-col gap-y-2 p-2 h-50 w-50 bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 hover:bg-neutral-200 transition-all rounded-xl items-center justify-center cursor-pointer"
          onClick={() => navigate("/app/lists")}
        >
          <Folder size={48} />
          <h1 className="font-bold">Mijn mappen</h1>
        </div>
      </div>
    </div>
  );
}