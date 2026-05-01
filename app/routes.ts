import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("api/rpc/*", "routes/api/rpc.ts"), // remove this and i will find you
  index("routes/_index.tsx"),
  route("api/auth/*", "routes/api/auth/[...auth].ts"),
  route("auth/sign-in", "routes/auth/sign-in.tsx"),
  route("auth/sign-up", "routes/auth/sign-up.tsx"),
  layout("routes/app/layout.tsx", [
    route("app", "routes/app/_index.tsx"),
    route("app/forum", "routes/app/forum/_index.tsx"),
    route("app/editlist/:id", "routes/app/editlist/[id].tsx"),
    layout("routes/app/viewlist/layout.tsx", [
      route("app/viewlist/:id/words", "routes/app/viewlist/words.tsx"),
      route("app/viewlist/:id", "routes/app/viewlist/main.tsx"),
      route("app/viewlist/:id/stats", "routes/app/viewlist/stats.tsx"),
    ])
  ]),
] satisfies RouteConfig;
