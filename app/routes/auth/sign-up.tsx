import { Button, Input } from "@polarnl/polarui-react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Link, useRouteLoaderData } from "react-router";
import { useState } from "react";
import { zxcvbn } from "@zxcvbn-ts/core";
import { quotes } from "~/lib/quotes";
import i18n from "~/i18n";

export default function SignUpPage() {
  const rootData = useRouteLoaderData("root") as any;
  const theme = rootData?.theme || "dark";
  const lang = rootData?.lang || "nl";
  const t = i18n.t;

  const filteredQuotes = quotes.filter((q) => q.lang === lang);
  const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passResult = password ? zxcvbn(password) : null;
  const score = passResult ? passResult.score : 0;

  let scoreText = "";
  if (password) {
    if (score < 2) scoreText = t("auth:passwordStrengthWeak");
    else if (score < 4) scoreText = t("auth:passwordStrengthMedium");
    else scoreText = t("auth:passwordStrengthStrong");
  }

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
      <div className="p-10 w-full md:w-[33%] flex flex-col justify-center">
        <h1 className="text-4xl font-bold mb-2 text-white">{t("auth:signupTitle")}</h1>
        <p className="text-lg mb-8 text-neutral-300">{t("auth:signupSubtitle")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <label
            htmlFor="username"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:username")}
          </label>
          <Input
            id="username"
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<User />}
            placeholder={t("auth:usernamePlaceholder")}
            className="w-full mb-5"
          />

          <label
            htmlFor="email"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:email")}
          </label>
          <Input
            id="email"
            scheme={theme === "dark" ? "dark" : "light"}
            icon={<Mail />}
            placeholder={t("auth:emailPlaceholder")}
            className="w-full mb-5"
          />

          <label
            htmlFor="password"
            className={`block mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}
          >
            {t("auth:password")}
          </label>
          <div className="relative mb-3">
            <Input
              id="password"
              scheme={theme === "dark" ? "dark" : "light"}
              icon={<Lock />}
              type={showPassword ? "text" : "password"}
              placeholder={t("auth:passwordPlaceholder")}
              className="w-full pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
                        style={{ transitionDelay: `${(level - 1) * 70}ms` }}
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
            {t("auth:signupButton")} →
          </Button>

          <div className="w-full items-center justify-center mt-6 flex gap-1">
            <p className="font-medium text-sm text-neutral-400">
              {t("auth:signinNoAccount")}
            </p>
            <Link
              to="/auth/sign-in"
              className="text-sm text-sky-400 font-bold hover:underline"
            >
              {t("auth:loginLink")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}