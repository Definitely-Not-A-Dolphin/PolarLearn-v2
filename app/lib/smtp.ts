import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT ?? "587")

export const smtpTransport = host
  ? nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  : null

