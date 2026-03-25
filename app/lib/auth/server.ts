import { prisma } from "../db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, organization, username } from "better-auth/plugins"
import { sso } from "@better-auth/sso"
import { passkey } from "@better-auth/passkey"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  baseURL: process.env.APP_BASE as string,
  emailAndPassword: { enabled: true },
  secret: process.env.SECRET,
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
        return user.role === "admin";
      },
      organizationHooks: {
        afterCreateOrganization: async ({ organization, user: creator }) => {
          const superadmins = await prisma.user.findMany({
            where: { role: "admin" }
          });
          const adminsToAdd = superadmins.filter(admin => admin.id !== creator.id);
          if (adminsToAdd.length > 0) {
            await prisma.member.createMany({
              data: adminsToAdd.map(admin => ({
                id: crypto.randomUUID(),
                organizationId: organization.id,
                userId: admin.id,
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