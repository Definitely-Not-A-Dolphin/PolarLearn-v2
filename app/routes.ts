import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("api/auth/*", "routes/api/auth/[...auth].ts"),
  route("auth/sign-in", "routes/auth/sign-in.tsx"),
  route("auth/sign-up", "routes/auth/sign-up.tsx"),
  layout("routes/app/layout.tsx", [
    route("home", "routes/app/_index.tsx"),
    route("home/forum", "routes/app/forum/_index.tsx"),
    route("home/editlist/:id", "routes/app/editlist/[id].tsx"),
  ]),
] satisfies RouteConfig;
