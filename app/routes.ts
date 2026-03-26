import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("api/auth/*", "routes/api/auth/[...auth].ts"),
  route("auth/sign-in", "routes/auth/sign-in.tsx"),
  route("auth/sign-up", "routes/auth/sign-up.tsx"),
  layout("routes/home/layout.tsx", [
    route("home", "routes/home/_index.tsx"),
  ])
] satisfies RouteConfig;
