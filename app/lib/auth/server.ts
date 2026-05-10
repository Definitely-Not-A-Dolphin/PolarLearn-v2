import { prisma } from "../db";
import { betterAuth, logger } from "better-auth";
import { i18n as betterAuthI18n } from "@better-auth/i18n";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, username } from "better-auth/plugins"
import { createAuthMiddleware, getIp } from "better-auth/api";
import { sso } from "@better-auth/sso"
import { passkey } from "@better-auth/passkey"
import { readFile } from "node:fs/promises";
import nunjucks from "nunjucks";
import { logger as appLogger } from "../logger"
import { betterAuthTranslations } from "./betterauth-i18n";
import i18n from "~/i18n";
import { smtpTransport } from "~/lib/smtp";

const activationEmailTemplateUrl = new URL("./activation-email.html", import.meta.url);
const forgotPasswordEmailTemplateUrl = new URL("./forgot-password-email.html", import.meta.url);

export const auth = betterAuth({
  telemetry: {
    enabled: false // fuck you
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  baseURL: process.env.APP_BASE as string,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!process.env.SMTP_HOST,
    sendResetPassword: async ({ user, url }) => {
      if (!smtpTransport) {
        appLogger.warn({
          event: "auth.email.verification.skipped",
          reason: "smtp-not-configured",
          userId: user.id,
          email: user.email,
        })
        return
      }
      const template = await readFile(forgotPasswordEmailTemplateUrl, "utf8")
      const html = nunjucks.renderString(template, {
        username: user.name?.trim() || user.email.split("@")[0] || "",
        reset_url: url,
      })
      await smtpTransport.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: user.email,
        subject: "PolarLearn | Wachtwoord Resetten",
        html,
      })
    },
    revokeSessionsOnPasswordReset: true
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      if (!smtpTransport) {
        appLogger.warn({
          event: "auth.email.verification.skipped",
          reason: "smtp-not-configured",
          userId: user.id,
          email: user.email,
        })
        return
      }

      const username = user.name?.trim() || user.email.split("@")[0] || ""
      const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER

      if (!fromAddress) {
        throw new Error("NO_SMTP")
      }

      const template = await readFile(activationEmailTemplateUrl, "utf8")
      const html = nunjucks.renderString(template, {
        username,
        activation_url: url,
      })

      await smtpTransport.sendMail({
        from: fromAddress,
        to: user.email,
        subject: "PolarLearn | Activeer je account",
        html,
      })
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true
  },
  user: {
    deleteUser: {
      enabled: true
    },
    additionalFields: {
      forumBanned: {
        type: "boolean",
      },
      forumBanReason: {
        type: "string",
        nullable: true,
      },
      banReason: {
        type: "string",
        nullable: true,
      },
    }
  },
  secret: process.env.SECRET,
  trustedOrigins: ["*"],
  advanced: {
    database: {
      generateId: () => {
        return crypto.randomUUID()
      }
    },
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
    level: "debug",
    log: (level, message, ...args) => {
      appLogger[level](message, ...args)
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
    betterAuthI18n({
      translations: betterAuthTranslations,
      detection: ["callback"],
      defaultLocale: i18n.DEFAULT_LANG,
      getLocale: () => {
        return i18n.language ?? null
      },
    }),
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
    // Too hard to figure out how to couple lists to orgs, and not scoping/locking admins to an org
    // Will implement later
    // organization({
    //   allowUserToCreateOrganization: async (user) => {
    //     const target = await prisma.user.findFirst({
    //       where: { id: user.id },
    //     })
    //     return target?.role === "admin";
    //   },
    //   organizationHooks: {
    //     afterCreateOrganization: async ({ organization, user: creator }) => {
    //       const superadmins = await prisma.user.findMany({
    //         where: { role: "admin" }
    //       });
    //       const adminsToAdd = superadmins.filter((superadmin: { id: string }) => superadmin.id !== creator.id);
    //       if (adminsToAdd.length > 0) {
    //         await prisma.member.createMany({
    //           data: adminsToAdd.map((superadmin: { id: string }) => ({
    //             id: crypto.randomUUID(),
    //             organizationId: organization.id,
    //             userId: superadmin.id,
    //             role: "owner",
    //             createdAt: new Date(),
    //             updatedAt: new Date()
    //           }))
    //         });
    //       }
    //     }
    //   }
    // })
  ]
});