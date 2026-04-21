import { prisma } from "../db";
import { betterAuth, logger } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, username } from "better-auth/plugins"
import { createAuthMiddleware, getIp } from "better-auth/api";
import { sso } from "@better-auth/sso"
import { passkey } from "@better-auth/passkey"
import { logger as appLogger } from "../logger"

export const auth = betterAuth({
  telemetry: {
    enabled: false // fuck you
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
  baseURL: process.env.APP_BASE as string,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!process.env.SMTP_HOST
  },
  secret: process.env.SECRET,
  trustedOrigins: ["*"],
  advanced: {
    ipAddress: {
      ipAddressHeaders: [
        "x-forwarded-for",
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip"
      ],
      disableIpTracking: false,
    },
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
    cookiePrefix: "polarlearn.auth"
  },
  logger: {
    log: (level, message) => {
      logger[level](message)
    }
  },
  hooks: {
    // eslint-disable-next-line @typescript-eslint/require-await
    before: createAuthMiddleware(async (ctx) => {
      switch (ctx.path) {
        case "/sign-out": {
          const session = ctx.context.session
          if (!session) return

          const request = ctx.request
          const ipAddress = request ? getIp(request, ctx.context.options) : null

          appLogger.info({
            event: "auth.logout",
            path: ctx.path,
            userId: session.user.id,
            email: session.user.email,
            ipAddress,
            userAgent: request?.headers.get("user-agent") ?? null,
          })
          return
        }
        default:
          return
      }
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    after: createAuthMiddleware(async (ctx) => {
      switch (ctx.path) {
        case "/sign-in/email": {
          const newSession = ctx.context.newSession
          const request = ctx.request
          const ipAddress = request ? getIp(request, ctx.context.options) : null
          const userAgent = request?.headers.get("user-agent") ?? null
          const body = ctx.body as Record<string, unknown> | undefined
          const attemptedCredentials = {
            email: typeof body?.email === "string" ? body.email : null,
            callbackURL: typeof body?.callbackURL === "string" ? body.callbackURL : null,
          }

          if (!newSession) {
            appLogger.info({
              event: "auth.login.failed",
              path: ctx.path,
              attemptedCredentials,
              ipAddress,
              userAgent,
            })
            return
          }

          appLogger.info({
            event: "auth.login",
            path: ctx.path,
            userId: newSession.user.id,
            email: newSession.user.email,
            ipAddress,
            userAgent,
          })
          return
        }
      }
    })
  },
  plugins: [
    username(),
    admin({
      adminRoles: ["admin"],
    }),
    sso({
      organizationProvisioning: {
        disabled: false,
        defaultRole: "member",
      }
    }),
    passkey(),
    organization({
      allowUserToCreateOrganization: async (user) => {
        const target = await prisma.user.findFirst({
          where: { id: user.id },
        })
        return target?.role === "admin";
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user: creator }) => {
          const superadmins = await prisma.user.findMany({
            where: { role: "admin" }
          });
          const adminsToAdd = superadmins.filter((superadmin: { id: string }) => superadmin.id !== creator.id);
          if (adminsToAdd.length > 0) {
            await prisma.member.createMany({
              data: adminsToAdd.map((superadmin: { id: string }) => ({
                id: crypto.randomUUID(),
                organizationId: organization.id,
                userId: superadmin.id,
                role: "owner",
                createdAt: new Date(),
                updatedAt: new Date()
              }))
            });
          }
        }
      }
    })
  ]
});