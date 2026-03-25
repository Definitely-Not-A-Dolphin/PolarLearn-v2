import { Button, Input } from "@polarnl/polarui-react";
import { Mail, Lock, Loader2, LogIn } from "lucide-react"
import { Link, useRouteLoaderData, useNavigate } from "react-router";
import { Image } from "@unpic/react"
import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { authClient } from "~/lib/auth/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { quotes } from "~/lib/quotes"
import entree from "~/img/entree.svg"
import pnl_logo from "~/img/pnl.svg"
import i18n from "~/i18n";

export default function SignInPage() {
  const rootData = useRouteLoaderData("root") as any;
  const theme = rootData?.theme || "dark";
  const lang = rootData?.lang || "nl";
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
      gsap.fromTo(
        passwordContainerRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [showPassword]);

  const filteredQuotes = quotes.filter((q) => q.lang === lang);
  const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];

  return (
    <div className="flex flex-row h-screen w-screen">
      <div className="w-[67%] bg-linear-to-b from-sky-400 to-sky-100 h-full md:flex hidden flex-col justify-center px-16 lg:px-32">
        <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold font-sans text-black tracking-tight leading-tight">
          {randomQuote.text}
        </h1>
        <p className="text-2xl lg:text-4xl text-black font-sans font-semibold mt-8">
          ~ {randomQuote.author}
        </p>
      </div>
      <div className="p-10 w-full md:w-[33%] flex flex-col">
        <h1 className="text-5xl font-bold">{t("auth:signinTitle")}</h1>
        <p className="text-xl mt-3">{t("auth:signinSubtitle")}</p>
        <form onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          setIsLoading(true);

          if (!showPassword) {
            try {
              const sso = await authClient.signIn.sso({
                email: email,
                callbackURL: "/home",
              });

              if (sso.error) {
                setShowPassword(true);
              }
            } catch (err) {
              setShowPassword(true);
            } finally {
              setIsLoading(false);
            }
          } else {
            try {
              const res = await authClient.signIn.email({
                email,
                password,
              });

              if (res?.error) {
                toast.error(res.error.message || "Failed to sign in");
              } else {
                navigate("/home");
              }
            } catch (err: any) {
              toast.error(err.message || "An error occurred");
            } finally {
              setIsLoading(false);
            }
          }
        }}>
          <label
            htmlFor="email"
            className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
            {t("auth:email")}
          </label>
          <Input
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<Mail />}
            placeholder={t("auth:emailPlaceholder")}
            className="w-full "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={showPassword}
            required
          />

          <div ref={passwordContainerRef} className="overflow-hidden opacity-0" style={{ height: showPassword ? "auto" : 0 }}>
            <label
              htmlFor="password"
              className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>
              {t("auth:password")}
            </label>
            <Input
              scheme={theme === "dark" ? "dark" : "light"}
              icon={<Lock />}
              type="password"
              placeholder={t("auth:passwordPlaceholder")}
              className="w-full mb-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={showPassword}
            />
            <Link
              to="/auth/forgot-pass"
              className="text-md text-sky-400 font-bold block mb-2">
              {t("auth:forgotPassword")}
            </Link>
          </div>

          <Button
            textColor={theme === "dark" ? "black" : "white"}
            color="sky"
            className="w-full mt-5"
            type="submit"
            disabled={isLoading}
            icon={isLoading ? <Loader2 className="animate-spin" /> : <LogIn />}>
            {isLoading ? t("auth:signinLoading") : (showPassword ? t("auth:login") : t("auth:signinContinue"))}
          </Button>
          <div className="w-full items-center justify-center mt-4 flex gap-1">
            <p className="font-bold">
              {t("auth:signinNoAccount")}
            </p>
            <Link
              to="/auth/sign-up"
              className="text-md text-sky-400 font-bold hover:underline">
              {t("auth:signinCreateOne")}
            </Link>
          </div>
          <div className="flex items-center my-4">
            <hr className="grow border-neutral-600" />
            <span className="mx-4 text-gray-500 dark:text-gray-400 font-bold">{t("auth:signinSeparator")}</span>
            <hr className="grow border-neutral-600" />
          </div>
          <div className="flex flex-col gap-4">
            <Button
              textColor={theme === "dark" ? "white" : "black"}
              className="w-full" type="button"
              color={theme === "dark" ? "dark" : "light"}
              icon={<Image src={entree} width={23} height={23} />}>
              {t("auth:signinEntree")}
            </Button>
            <Button
              textColor={theme === "dark" ? "white" : "black"}
              className="w-full" type="button"
              color={theme === "dark" ? "dark" : "light"}
              icon={<Image src={pnl_logo} width={23} height={23} />}>
              {t("auth:signinStaff")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}