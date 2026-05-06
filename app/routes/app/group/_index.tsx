import { redirect } from "react-router";
import type { Route } from "./+types/_index";

export function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  if (!id) {
    throw new Response("", { status: 400 });
  }
  return redirect(`/app/group/${id}/lists`);
}