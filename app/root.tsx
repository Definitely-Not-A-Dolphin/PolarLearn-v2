import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Route } from "./+types/root";
import "./app.css";
import { initI18n } from "./i18n";
import { Toaster } from "./components/ui/sonner";
import i18n from "./i18n";
import polarlearnLogo from "~/img/polarlearn.svg";
import { auth } from "./lib/auth/server";
import { TRPCReactProvider } from "./server/react";
import type { RootLoaderData, Theme } from "./lib/root-data";
import ImpersonationBanner from "./components/impersonation";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: polarlearnLogo },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  },
];

export async function loader(loaderArgs: {
  request: Request;
}): Promise<RootLoaderData> {
  const headers = new Headers(loaderArgs.request.headers);
  const result = await auth.api.getSession({ headers });
  const user = result?.user;
  const session = result?.session;
  const theme: Theme = "dark";

  return {
    theme,
    lang: process.env.APP_LANG ?? "nl",
    user: {
      id: user?.id ?? null,
      name: user?.name ?? null,
      image: user?.image ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
    },
    impersonatedBy: session?.impersonatedBy ?? null,
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<typeof loader>("root");
  const theme = loaderData?.theme ?? "dark";
  const lang = loaderData?.lang;

  initI18n(lang);

  return (
    <html lang={lang} className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans">
        <Toaster richColors position="top-center" theme={theme} />
        <TRPCReactProvider>
          <ImpersonationBanner />
          {children}
        </TRPCReactProvider>
        <ScrollRestoration />
      </body>
    </html>
  );
}

// istg if anyone removes this i will find you and I will end you
// remove = break entire app
// neither do i know why it is like that
// best regards andrei1010
export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const t = i18n.t;
  let message = t("errors.page.unavailableTitle");
  let details = t("errors.500.message");
  let stack: string | undefined;
  let technicalDetails = t("errors.unknown");

  if (isRouteErrorResponse(error)) {
    message =
      error.status === 404
        ? t("errors.404.title")
        : t("errors.page.unavailableTitle");
    details =
      error.status === 404 ? t("errors.404.message") : t("errors.500.message");
    technicalDetails = error.statusText || error.status.toString();
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message || details;
    stack = error.stack;
    technicalDetails = error.message;
  } else if (error instanceof Error) {
    technicalDetails = error.message || technicalDetails;
  }

  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-155 text-left">
        <img src={polarlearnLogo} alt="PolarLearn" className="h-15 w-15 mb-5" />

        <h1 className="text-[23px] leading-tight font-bold text-foreground mb-2">
          {message}
        </h1>
        <p className="text-[19px] leading-relaxed text-muted-foreground">
          {details}
        </p>

        <p className="text-[16px] text-muted-foreground mt-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            {t("errors.page.reloadAction")}
          </button>{" "}
          {t("errors.page.reloadHint")}
        </p>

        <button
          type="button"
          onClick={() => {
            setIsMoreInfoOpen((value) => !value);
          }}
          className="mt-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {t("errors.page.moreInfo")}
          <ChevronDown
            className={`size-3.5 transition-transform ${isMoreInfoOpen ? "rotate-180" : "rotate-0"}`}
          />
        </button>

        {isMoreInfoOpen ? (
          <div className="mt-2 rounded-lg border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
            <p>{technicalDetails}</p>
            {stack ? (
              <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-background/80 p-2 text-[11px] text-muted-foreground">
                <code>{stack}</code>
              </pre>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
