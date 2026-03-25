import { Button, Input } from "@polarnl/polarui-react";
import { Mail, Lock } from "lucide-react"
import { Link, useRouteLoaderData } from "react-router";
import { Image } from "@unpic/react"
import { quotes } from "~/lib/quotes"
import entree from "~/img/entree.svg"
import pnl_logo from "~/img/pnl.svg"

export default function SignInPage() {
  const rootData = useRouteLoaderData("root");
  const theme = rootData?.theme || "dark";
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]

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
        <h1 className="text-5xl font-bold">Log in</h1>
        <p className="text-xl mt-3">Met uw <strong>PolarLearn</strong> account.</p>
        <form>
          <label htmlFor="email" className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>E-mailadres</label>
          <Input scheme={theme === "dark" ? "dark" : "light"} icon={<Mail />} placeholder="Je e-mailadres" className="w-full " />
          <label htmlFor="password" className={`block mt-5 mb-2 text-sm font-medium ${theme === "dark" ? "text-white" : "text-neutral-900"}`}>Wachtwoord</label>
          <Input scheme={theme === "dark" ? "dark" : "light"} icon={<Lock />} type="password" placeholder="Je wachtwoord" className="w-full mb-2" />
          <Link to="/auth/forgot-pass" className="text-md text-sky-400 font-bold">Wachtwoord vergeten?</Link>
          <Button textColor={theme === "dark" ? "black" : "white"} color="sky" className="w-full mt-5" type="submit">Inloggen</Button>
          <div className="w-full items-center justify-center mt-4 flex gap-1">
            <p className="font-bold">Geen account?</p>
            <Link to="/auth/sign-up" className="text-md text-sky-400 font-bold">Maak er eentje!</Link>
          </div>
          <div className="flex items-center my-4">
            <hr className="grow border-neutral-600" />
            <span className="mx-4 text-gray-500 dark:text-gray-400 font-bold">OF</span>
            <hr className="grow border-neutral-600" />
          </div>
          <div className="flex flex-col gap-4">
            <Button textColor={theme === "dark" ? "black" : "white"} className="w-full" type="button" color={theme === "dark" ? "light" : "dark"} icon={<Image src={entree} width={23} height={23} />}>Inloggen met Entree Federatie</Button>
            <Button textColor={theme === "dark" ? "black" : "white"} className="w-full" type="button" color={theme === "dark" ? "light" : "dark"} icon={<Image src={pnl_logo} width={23} height={23} />}>Medewerkers inlog</Button>
          </div>
        </form>
      </div>
    </div>
  )
}