import i18n from "~/i18n";

const errorCodeToTranslationKey: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "auth:errors.invcreds",
  INVALID_USERNAME_OR_PASSWORD: "auth:errors.invcreds",
  INVALID_CREDENTIALS: "auth:errors.invcreds",
  INVCREDS: "auth:errors.invcreds",
  USERNAME_TOO_SHORT: "auth:errors.UserShort",
  USERNAME_IS_INVALID: "auth:errors.usernameIsInvalid",
  PROVIDER_NOT_ENABLED: "auth:errors.ProviderDisabled",
  PROVIDER_DISABLED: "auth:errors.ProviderDisabled",
  OAUTH_ERROR: "auth:errors.AuthError",
  PROVIDER_ERROR: "auth:errors.AuthError",
  OAUTH_EMAIL_MISSING: "auth:errors.AuthError",
  OAUTH_ACCOUNT_NOT_LINKED: "auth:errors.noConnectedAccount",
  ACCOUNT_DISABLED: "auth:errors.AccountDisabled",
  SIGNUP_DISABLED: "auth:errors.signupDisabled",
  RATE_LIMIT: "auth:errors.Ratelimit",
  RATELIMIT: "auth:errors.Ratelimit",
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

    const candidateCode = typedError.code || typedError.error;
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
