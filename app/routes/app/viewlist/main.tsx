import { redirect } from "react-router";
import type { Route } from "./+types/main";

export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/app/viewlist/${params.id as string}/words`);
}