// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { redirect } from "react-router";

import type { Route } from "./+types/_index";

export async function loader({ params }: Route.LoaderArgs) {
  const id = params.id;

  if (!id) {
    throw new Response("", { status: 400 });
  }

  return redirect(`/app/viewuser/${id}/lists`);
}

export default function ViewUserIndexRoute() {
  return null;
}