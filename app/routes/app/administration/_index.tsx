import { redirect } from 'react-router';
import type { Route } from './+types/_index'

export async function loader(loaderArgs: Route.LoaderArgs) {
  return redirect("/app/administration/general");
}