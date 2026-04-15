import { auth } from "~/lib/auth/server";
import { redirect, useNavigate } from "react-router";

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
  return (
    <div className="">
      assdf
    </div>
  );
}