import "dotenv/config"
import winston from "winston"
import LokiTransport from "winston-loki"

const ANSI = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m"
} as const

const colorForLevel: Record<string, string> = {
  error: ANSI.red,
  warn: ANSI.yellow,
  info: ANSI.green,
  http: ANSI.magenta,
  verbose: ANSI.cyan,
  debug: ANSI.blue,
  silly: ANSI.white
}

const colorize = (value: unknown, color: string) => `${color}${String(value)}${ANSI.reset}`

const renderMessage = (message: unknown) => {
  if (typeof message === "string") return message

  try {
    return JSON.stringify(message)
  } catch {
    return String(message)
  }
}

const loggerLevel = process.env.LOG_LEVEL ?? "info"

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message }) => {
    const levelColor = colorForLevel[level] ?? ANSI.white

    return [
      colorize(timestamp, ANSI.gray),
      colorize(level, levelColor),
      colorize(renderMessage(message), levelColor)
    ].join(" ")
  })
)

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: loggerLevel,
    format: consoleFormat
  })
]

const lokiHost = process.env.LOKI_HOST

if (!!lokiHost) {
  transports.push(
    new LokiTransport({
      host: lokiHost,
      basicAuth: process.env.LOKI_BASIC_AUTH?.trim() || undefined,
      format: winston.format.json(),
      json: true,
      labels: {
        app: "polarlearn-v2",
        environment: process.env.NODE_ENV ?? "development"
      },
      level: loggerLevel
    })
  )
}

export const logger = winston.createLogger({
  level: loggerLevel,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.timestamp()
  ),
  transports
})