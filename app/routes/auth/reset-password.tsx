import { Button, Input } from "@polarnl/polarui-react";
import { Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { Link, redirect, useLoaderData, useNavigate, useRouteLoaderData } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import i18n from "~/i18n";
import { authClient } from "~/lib/auth/client";
import { getRandomQuote } from "~/lib/quotes";
import { auth } from "~/lib/auth/server";
import type { RootLoaderData } from "~/lib/root-data";

export async function loader({ request }: { request: Request }) {
  const headers = new Headers(request.headers);
  const result = await auth.api.getSession({ headers });
  if (result?.user) return redirect("/app");

  const url = new URL(request.url);
  const lang = process.env.APP_LANG ?? "nl";

  return {
    quote: getRandomQuote(lang),
    token: url.searchParams.get("token") ?? "",
    error: url.searchParams.get("error") ?? "",
  };
}

export default function ResetPasswordPage() {
  const { quote, token, error } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";
  const t = i18n.t;
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const invalidToken = error === "INVALID_TOKEN" || !token;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    if (!token) {
      toast.error(t("auth:resetPassword.missingToken"));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t("auth:resetPassword.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        toast.error(error.message ?? t("auth:errors.unknown"));
        return;
      }

      toast.success(t("auth:resetPassword.success"));
      void navigate("/auth/sign-in");
    } catch (err: any) {
      toast.error(err?.message ?? t("auth:errors.unknown"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen">
      <div className="w-[67%] bg-linear-to-b from-sky-400 to-sky-100 h-full md:flex hidden flex-col justify-center px-16 lg:px-32">
        <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold font-sans text-black tracking-tight leading-tight">
          {quote.text}
        </h1>
        <p className="text-2xl lg:text-4xl text-black font-sans font-semibold mt-8">
          ~ {quote.author}
        </p>
      </div>
      <div className="p-10 w-full md:w-[33%] flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-2 text-white">{t("auth:resetPassword.title")}</h1>
        <p className="text-lg mb-6 text-neutral-300">{t("auth:resetPassword.subtitle")}</p>

        {invalidToken ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 mb-6">
            {error === "INVALID_TOKEN"
              ? t("auth:resetPassword.invalidToken")
              : t("auth:resetPassword.missingToken")}
          </div>
        ) : null}

        <form onSubmit={(e) => { void handleSubmit(e); }}>
          <label
            htmlFor="newPassword"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:resetPassword.newPassword")}
          </label>
          <div className="relative mb-5">
            <Input
              id="newPassword"
              name="newPassword"
              scheme={theme === "dark" ? "dark" : "light"}
              icon={<Lock />}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth:resetPassword.newPasswordPlaceholder")}
              className="w-full pr-10"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); }}
              disabled={invalidToken}
              required
            />
            <button
              type="button"
              onClick={() => { setShowPassword(!showPassword); }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          </div>

          <label
            htmlFor="confirmPassword"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:resetPassword.confirmPassword")}
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<Lock />}
            type={showPassword ? "text" : "password"}
            placeholder={t("auth:resetPassword.confirmPasswordPlaceholder")}
            className="w-full mb-6"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); }}
            disabled={invalidToken}
            required
          />

          <Button
            textColor={theme === "dark" ? "black" : "white"}
            color="sky"
            className="w-full"
            type="submit"
            disabled={isLoading || invalidToken}
            icon={isLoading ? <Loader2 className="animate-spin" /> : undefined}
          >
            {isLoading ? t("auth:resetPassword.loading") : t("auth:resetPassword.submit")}
          </Button>

          <div className="w-full items-center justify-center mt-6 flex gap-1">
            <p className="font-medium text-sm text-neutral-400">
              {t("auth:resetPassword.backToSignInText")}
            </p>
            <Link
              to="/auth/sign-in"
              className="text-sm text-sky-400 font-bold hover:underline"
            >
              {t("auth:resetPassword.backToSignIn")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}