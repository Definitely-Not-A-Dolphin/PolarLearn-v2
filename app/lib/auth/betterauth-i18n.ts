import i18n from "~/i18n";

const errorCodeToTranslationKey = {
  INVALID_EMAIL_OR_PASSWORD: "auth:errors.invalidCredentials",
  INVALID_USERNAME_OR_PASSWORD: "auth:errors.invalidCredentials",
  INVALID_CREDENTIALS: "auth:errors.invalidCredentials",
  INVCREDS: "auth:errors.invalidCredentials",
  USERNAME_TOO_SHORT: "auth:errors.usernameTooShort",
  USERNAME_IS_INVALID: "auth:errors.usernameInvalid",
  PROVIDER_NOT_ENABLED: "auth:errors.providerDisabled",
  PROVIDER_DISABLED: "auth:errors.providerDisabled",
  OAUTH_ERROR: "auth:errors.authError",
  PROVIDER_ERROR: "auth:errors.authError",
  OAUTH_EMAIL_MISSING: "auth:errors.authError",
  OAUTH_ACCOUNT_NOT_LINKED: "auth:errors.noConnectedAccount",
  ACCOUNT_DISABLED: "auth:errors.accountDisabled",
  SIGNUP_DISABLED: "auth:errors.signupDisabled",
  RATE_LIMIT: "auth:errors.rateLimit",
  RATELIMIT: "auth:errors.rateLimit",
  UNKNOWN: "auth:errors.unknown",
} as const;

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function translateFromResource(resource: Record<string, unknown>, key: string): string | undefined {
  const normalizedKey = key.includes(":") ? key.replace(":", ".") : key;
  const value = resolvePath(resource, normalizedKey);

  return typeof value === "string" ? value : undefined;
}

const defaultLocaleResource = i18n.resources[i18n.DEFAULT_LANG] ?? {};

function buildLocaleTranslations(resource: Record<string, unknown>): Record<string, string> {
  const translations: Record<string, string> = {};

  for (const [errorCode, translationKey] of Object.entries(errorCodeToTranslationKey)) {
    const translatedMessage =
      translateFromResource(resource, translationKey) ??
      translateFromResource(defaultLocaleResource, translationKey);

    if (translatedMessage) {
      translations[errorCode] = translatedMessage;
    }
  }

  return translations;
}

export const betterAuthTranslations = Object.fromEntries(
  Object.entries(i18n.resources).map(([locale, resource]) => [
    locale,
    buildLocaleTranslations(resource),
  ]),
) as Record<string, Record<string, string>>;
