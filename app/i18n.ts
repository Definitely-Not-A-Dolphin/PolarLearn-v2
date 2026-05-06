type TranslationValue = string | Record<string, unknown>;

const modules = import.meta.glob("./i18n/*.json", { eager: true });

const resources: Record<string, Record<string, unknown>> = {};

const DEFAULT_LANG = "nl";

for (const path in modules) {
  const match = (/\/([^/]+)\.json$/).exec(path);
  if (match) {
    const lang = match[1];
    const mod = modules[path] as { default: Record<string, unknown> } | Record<string, unknown>;
    resources[lang] = ('default' in mod ? mod.default : mod) as Record<string, unknown>;
  }
}

let currentLanguage = DEFAULT_LANG;
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
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      : String(replacement);
  });
}

function translate(key: string, options?: { defaultValue?: string } & Record<string, unknown>): string {
  const normalizedKey = key.includes(":") ? key.replace(":", ".") : key;
  const languageResource = resources[currentLanguage] ?? resources[DEFAULT_LANG];
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
    currentLanguage = lang || DEFAULT_LANG;
    initialized = true;
    return i18n;
  },
  t: translate,
  resources,
  DEFAULT_LANG,
};

export function initI18n(lang: string = DEFAULT_LANG) {
  return i18n.changeLanguage(lang);
}

export const t = translate;

export default i18n;