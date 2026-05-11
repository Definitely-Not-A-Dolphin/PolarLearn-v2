import nodemailer from "nodemailer";

const createSmtpTransport = () => {
  const host = process.env.SMTP_HOST
  if (!host) return null

  const port = Number(process.env.SMTP_PORT ?? "587")
  const secure = process.env.SMTP_SECURE === "true" || port === 465
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })
}

export const smtpTransport = createSmtpTransport()

