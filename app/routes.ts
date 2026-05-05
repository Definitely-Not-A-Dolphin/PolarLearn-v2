import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("api/rpc/*", "routes/api/rpc.ts"), // remove this and i will find you
  index("routes/_index.tsx"),
  route("api/auth/*", "routes/api/auth/[...auth].ts"),
  route("auth/sign-in", "routes/auth/sign-in.tsx"),
  route("auth/sign-up", "routes/auth/sign-up.tsx"),
  layout("routes/app/layout.tsx", [
    route("app", "routes/app/_index.tsx"),
    layout("routes/app/forum/layout.tsx", [
      route("app/forum/posts", "routes/app/forum/posts.tsx"),
      route("app/forum/myPosts", "routes/app/forum/myPosts.tsx"),
      route("app/forum/myReplies", "routes/app/forum/myReplies.tsx"),
      route("app/forum", "routes/app/forum/_index.tsx"),
    ]),
    route("app/forum/posts/:postid", "routes/app/forum/[postid].tsx"),
    route("app/editlist/:id", "routes/app/editlist/[id].tsx"),
    layout("routes/app/viewlist/layout.tsx", [
      route("app/viewlist/:id/words", "routes/app/viewlist/words.tsx"),
      route("app/viewlist/:id", "routes/app/viewlist/main.tsx"),
      route("app/viewlist/:id/stats", "routes/app/viewlist/stats.tsx"),
      route("app/viewlist/:id/stats/:sessionId", "routes/app/viewlist/stats-session.tsx"),
    ]),
    route("app/favorites", "routes/app/favorites.tsx"),
    route("app/mylists", "routes/app/mylists.tsx"),
    layout("routes/app/viewuser/layout.tsx", [
      route("app/viewuser/:id/folders", "routes/app/viewuser/folders.tsx"),
      route("app/viewuser/:id/groups", "routes/app/viewuser/groups.tsx"),
      route("app/viewuser/:id/lists", "routes/app/viewuser/lists.tsx"),
      route("app/viewuser/:id/posts", "routes/app/viewuser/posts.tsx"),
      route("app/viewuser/:id", "routes/app/viewuser/_index.tsx"),
    ]),
    route("app/groups", "routes/app/groups.tsx"),
  ]),
  route("app/session/:id", "routes/app/session/[id].tsx")
] satisfies RouteConfig;
