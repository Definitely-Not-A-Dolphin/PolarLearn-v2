import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client"
import { adminClient, organizationClient, usernameClient } from "better-auth/client/plugins"
import { ssoClient } from "@better-auth/sso/client"

export const authClient = createAuthClient({
  plugins: [
    passkeyClient(),
    usernameClient(),
    adminClient(),
    organizationClient(),
    ssoClient()
  ]
});
