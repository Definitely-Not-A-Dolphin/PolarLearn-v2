import nlTranslation from "./i18n/nl.json";

type TranslationValue = string | Record<string, unknown>;

type TranslationResources = {
  nl: Record<string, unknown>;
};

const resources: TranslationResources = {
  nl: nlTranslation as Record<string, unknown>,
};

let currentLanguage = "nl";
let initialized = false;

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(value: string, options?: Record<string, unknown>): string {
  if (!options) {
    return value;
  }

  return value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const replacement = options[key];
    return replacement === undefined || replacement === null
      ? ""
      : String(replacement);
  });
}

function translate(key: string, options?: { defaultValue?: string } & Record<string, unknown>): string {
  const normalizedKey = key.includes(":") ? key.replace(":", ".") : key;
  const languageResource = resources[currentLanguage] ?? resources.nl;
  const value = resolvePath(languageResource, normalizedKey) as TranslationValue | undefined;

  if (typeof value === "string") {
    return interpolate(value, options);
  }

  return options?.defaultValue ?? key;
}

const i18n = {
  get language() {
    return currentLanguage;
  },
  get isInitialized() {
    return initialized;
  },
  changeLanguage(lang: string) {
    currentLanguage = lang || "nl";
    initialized = true;
    return i18n;
  },
  t: translate,
  resources,
};

export function initI18n(lang: string = "nl") {
  return i18n.changeLanguage(lang);
}

export default i18n;