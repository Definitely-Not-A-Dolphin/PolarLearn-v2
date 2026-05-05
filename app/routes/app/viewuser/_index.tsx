import { redirect } from "react-router";

import type { Route } from "./+types/_index";

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;

  if (!id) {
    throw new Response("", { status: 400 });
  }

  return redirect(`/app/viewuser/${id}/folders`);
}

export default function ViewUserIndexRoute() {
  return null;
}