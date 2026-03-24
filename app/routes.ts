import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/auth/*", "routes/api/auth/[...auth].ts"),
  route("auth/sign-in", "routes/auth/sign-in.tsx"),
] satisfies RouteConfig;
