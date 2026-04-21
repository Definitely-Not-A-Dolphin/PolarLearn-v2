import { Button, Input } from "@polarnl/polarui-react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Link, redirect, useLoaderData, useNavigate, useRouteLoaderData } from "react-router";
import { useState } from "react";
import { zxcvbn } from "@zxcvbn-ts/core";
import { toast } from "sonner"
import { getRandomQuote } from "~/lib/quotes";
import i18n from "~/i18n";
import { authClient } from "~/lib/auth/client";
import { getBetterAuthErrorMessage } from "~/lib/auth/betterauth-i18n";
import type { Route } from "./+types/sign-up";
import { auth } from "~/lib/auth/server";

export async function loader(loaderArgs: Route.LoaderArgs) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (user) {
    return redirect('/home')
  }

  const lang = process.env.APP_LANG ?? "nl";

  return {
    quote: getRandomQuote(lang),
  };
}

export default function SignUpPage() {
  interface RootData {
    theme: "light" | "dark";
    lang: string;
    user: {
      name: string | null;
      image: string | null;
      email: string | null;
      role: string | null;
    } | null;
  }

  const { quote } = useLoaderData<typeof loader>();
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
  const rootData = useRouteLoaderData("root") as RootData;
  const theme = rootData.theme;
  const t = i18n.t;
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passResult = password ? zxcvbn(password) : null;
  const score = passResult ? passResult.score : 0;

  let scoreText = "";
  if (password) {
    if (score < 2) scoreText = t("auth:signUp.passwordStrength.weak");
    else if (score < 4) scoreText = t("auth:signUp.passwordStrength.medium");
    else scoreText = t("auth:signUp.passwordStrength.strong");
  }

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
        <h1 className="text-4xl font-bold mb-2 text-white">{t("auth:signUp.title")}</h1>
        <p className="text-lg mb-8 text-neutral-300">{t("auth:signUp.subtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const username = formData.get("username") as string;
            const email = formData.get("email") as string;
            const passwordValue = formData.get("password") as string;
            
            authClient.signUp.email({
              name: username,
              username,
              email,
              password: passwordValue,
            }).then((res) => {
              if (res.error) {
                toast.error(getBetterAuthErrorMessage(res.error));
                return;
              }

              toast.success(t("auth:signUp.ok"));
              void navigate("/auth/sign-in");
            }).catch((err: unknown) => {
              toast.error(getBetterAuthErrorMessage(err));
            });
          }}
        >
          <label
            htmlFor="username"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:signUp.username")}
          </label>
          <Input
            id="username"
            name="username"
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<User />}
            placeholder={t("auth:signUp.usernamePlaceholder")}
            className="w-full mb-5"
          />

          <label
            htmlFor="email"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:signUp.email")}
          </label>
          <Input
            id="email"
            name="email"
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<Mail />}
            placeholder={t("auth:signUp.emailPlaceholder")}
            className="w-full mb-5"
          />

          <label
            htmlFor="password"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:signUp.password")}
          </label>
          <div className="relative mb-3">
            <Input
              id="password"
              name="password"
              scheme={theme === "dark" ? "dark" : "light"}
              icon={<Lock />}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth:signUp.passwordPlaceholder")}
              className="w-full pr-10"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
            />
            <button
              type="button"
              onClick={() => { setShowPassword(!showPassword); }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          </div>

          {password && (
            <div className="mb-6">
              <div className="flex gap-2 w-full h-1.5">
                {[1, 2, 3, 4].map((level) => {
                  const isActive = score >= level;
                  const activeColor =
                    score === 4
                      ? "bg-green-500"
                      : score >= 2
                        ? "bg-yellow-500"
                        : "bg-red-500";

                  return (
                    <div
                      key={level}
                      className="relative flex-1 h-full rounded-full bg-neutral-600 overflow-hidden"
                    >
                      <div
                        className={`absolute inset-0 rounded-full origin-left transition-transform duration-300 ease-out ${activeColor} ${isActive ? "scale-x-100" : "scale-x-0"}`}
                        style={{ transitionDelay: `${((level - 1) * 70).toString()}ms` }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-sm mt-2 font-bold text-white">{scoreText}</p>
            </div>
          )}

          <Button
            textColor={theme === "dark" ? "black" : "white"}
            color="sky"
            className="w-full mt-6"
            type="submit"
          >
            {t("auth:signUp.button")} →
          </Button>

          <div className="w-full items-center justify-center mt-6 flex gap-1">
            <p className="font-medium text-sm text-neutral-400">
              {t("auth:signUp.haveAccount")}
            </p>
            <Link
              to="/auth/sign-in"
              className="text-sm text-sky-400 font-bold hover:underline"
            >
              {t("auth:actions.login")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}