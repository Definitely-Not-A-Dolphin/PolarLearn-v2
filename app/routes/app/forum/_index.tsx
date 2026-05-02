import { redirect } from "react-router";

export function loader() {
  return redirect("/app/forum/posts");
}

export default function ForumIndex() {
  return null;
}
