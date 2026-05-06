import { Button, Input } from "@polarnl/polarui-react";
import { Mail, Lock, Loader2, LogIn } from "lucide-react"
import { Link, useLoaderData, useRouteLoaderData, useNavigate, redirect } from "react-router";
import { Image } from "@unpic/react"
import { useState, useRef } from "react";
import { toast } from "sonner"
import { authClient } from "~/lib/auth/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { getRandomQuote } from "~/lib/quotes"
import entree from "~/img/entree.svg"
import i18n from "~/i18n";
import type { Route } from "./+types/sign-in";
import { auth } from "~/lib/auth/server";
import type { RootLoaderData } from "~/lib/root-data";

export async function loader(loaderArgs: Route.LoaderArgs) {
  const headers = new Headers(loaderArgs.request.headers)
  const result = await auth.api.getSession({ headers })
  const user = result?.user
  if (user) {
    return redirect('/app')
  }

  const lang = process.env.APP_LANG ?? "nl";

  return {
    quote: getRandomQuote(lang),
    enableEntreeFederatedSignIn: !!process.env.ENTREE_THING // We do not have a contract w/ kennisnet yet, later replace with actual env var
  };
}

export default function SignInPage() {
  const { quote, enableEntreeFederatedSignIn } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoaderData>("root");
  const theme = rootData?.theme ?? "dark";
  const t = i18n.t;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordContainerRef = useRef<HTMLDivElement>(null);

  gsap.registerPlugin(useGSAP);

  useGSAP(() => {
    if (showPassword && passwordContainerRef.current) {
      void gsap.fromTo(
        passwordContainerRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showPassword]);

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
      <div className="p-10 w-full md:w-[33%] flex flex-col">
        <h1 className="text-5xl font-bold">{t("auth:signIn.title")}</h1>
        <p className="text-xl mt-3">{t("auth:signIn.subtitle")}</p>
        <form onSubmit={(e: React.SyntheticEvent) => {
          e.preventDefault();
          setIsLoading(true);

          if (!showPassword) {
            authClient.signIn.sso({
              email: email,
              callbackURL: "/app",
            }).then((sso) => {
              if (sso.error) {
                setShowPassword(true);
              }
            }).catch(() => {
              setShowPassword(true);
            }).finally(() => {
              setIsLoading(false);
            });
          } else {
            authClient.signIn.email({
              email,
              password,
            }).then((res) => {
              if (res.error) {
                const authError = res.error as { message?: string; originalMessage?: string };
                toast.error(authError.message || authError.originalMessage || "Authentication failed.");
              } else {
                void navigate("/app");
              }
            }).catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message || "Authentication failed." : "Authentication failed.");
            }).finally(() => {
              setIsLoading(false);
            });
          }
        }}>
          <label
            htmlFor="email"
            className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
            {t("auth:signIn.email")}
          </label>
          <Input
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<Mail />}
            placeholder={t("auth:signIn.emailPlaceholder")}
            className="w-full "
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            disabled={showPassword}
            required
          />

          <div ref={passwordContainerRef} className="overflow-hidden opacity-0" style={{ height: showPassword ? "auto" : 0 }}>
            <label
              htmlFor="password"
              className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
              {t("auth:signIn.password")}
            </label>
            <Input
              scheme={theme === "dark" ? "dark" : "light"}
              icon={<Lock />}
              type="password"
              placeholder={t("auth:signIn.passwordPlaceholder")}
              className="w-full mb-2"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              required={showPassword}
            />
            <Link
              to="/auth/forgot-pass"
              className="text-md text-sky-400 font-bold block mb-2">
              {t("auth:signIn.forgotPassword")}
            </Link>
          </div>

          <Button
            textColor={theme === "dark" ? "black" : "white"}
            color="sky"
            className="w-full mt-5"
            type="submit"
            disabled={isLoading}
            icon={isLoading ? <Loader2 className="animate-spin" /> : <LogIn />}>
            {isLoading ? t("auth:signIn.loading") : (showPassword ? t("auth:actions.login") : t("auth:signIn.continue"))}
          </Button>
          <div className="w-full items-center justify-center mt-4 flex gap-1">
            <p className="font-bold">
              {t("auth:signIn.noAccount")}
            </p>
            <Link
              to="/auth/sign-up"
              className="text-md text-sky-400 font-bold hover:underline">
              {t("auth:signIn.createOne")}
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {rootData?.lang === "nl" && enableEntreeFederatedSignIn ? (
              <>
                <div className="flex items-center my-4">
                  <hr className="grow border-neutral-600" />
                  <span className="mx-4 text-gray-500 dark:text-gray-400 font-bold">{t("auth:signIn.separator")}</span>
                  <hr className="grow border-neutral-600" />
                </div>
                <Button
                  textColor={theme === "dark" ? "white" : "black"}
                  className="w-full" type="button"
                  color={theme === "dark" ? "dark" : "light"}
                  icon={<Image src={entree} width={23} height={23} />}>
                  {t("auth:signIn.entree")}
                </Button>
              </>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
