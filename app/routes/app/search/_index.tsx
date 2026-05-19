import { redirect } from "react-router";

export function loader({ request }: any) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  const to = q ? `/app/search/lists?q=${encodeURIComponent(q)}` : "/app/search/lists";

  return redirect(to);
}

export default function SearchIndex() {
  return null;
}
