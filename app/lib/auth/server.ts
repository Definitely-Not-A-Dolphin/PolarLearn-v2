import { prisma } from "../db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, username } from "better-auth/plugins"
import { passkey } from "@better-auth/passkey"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: "http://localhost:3000/",
  emailAndPassword: { enabled: true },
  secret: process.env.SECRET,
  plugins: [
    username(),
    admin(),
    passkey()
  ]
});