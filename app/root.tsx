import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { initI18n } from "./i18n";
import { Toaster } from "./components/ui/sonner";

export const links: Route.LinksFunction = () => [
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

export async function loader({ params }: Route.LoaderArgs) {
  const theme = "dark"; // replace later with actual thweme logic. Dark should be default and if no theme is found (e.g unauthenricated).
                        // Fetch theme from user configuration w/ prisma
  return {
    theme,
    lang: process.env.APP_LANG || "nl"
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useRouteLoaderData<typeof loader>("root");
  const theme = loaderData?.theme || "dark";
  const lang = loaderData?.lang || "nl";

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
        <Toaster richColors position="top-center" theme={theme as "dark" | "light"} />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// istg if anyone removes this i will find you and I will end you
// remove = break entire app
// neither do i know why it is like that
export default function App() {
  return <Outlet />;
}

// Sean can you make the error page look like the cloudflare one? thx
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
