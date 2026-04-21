import i18n from "~/i18n";

const errorCodeToTranslationKey: Record<string, string> = {
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
};

function normalizeErrorCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

export function getBetterAuthErrorMessage(error: unknown): string {
  const fallback = i18n.t("auth:errors.unknown");

  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    const normalized = normalizeErrorCode(error);
    const key = errorCodeToTranslationKey[normalized];
    return key ? i18n.t(key) : fallback;
  }

  if (typeof error === "object") {
    const typedError = error as {
      code?: string;
      message?: string;
      error?: string;
    };

    const candidateCode = typedError.code ?? typedError.error;
    if (candidateCode) {
      const normalized = normalizeErrorCode(candidateCode);
      const key = errorCodeToTranslationKey[normalized];
      if (key) {
        return i18n.t(key);
      }
    }
  }

  return fallback;
}
