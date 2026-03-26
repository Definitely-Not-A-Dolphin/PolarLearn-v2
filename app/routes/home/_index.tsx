import { Button } from "@polarnl/polarui-react";
import { authClient } from "~/lib/auth/client";
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
    <div className="flex items-center justify-center h-screen flex-col">
      <h1 className="text-4xl font-bold">Welcome to PolarLearn!</h1>
      <Button
        onClick={() => {
          authClient.signOut()
          navigate('/')
        }}
      >
        Log Out
      </Button>
    </div>
  );
}