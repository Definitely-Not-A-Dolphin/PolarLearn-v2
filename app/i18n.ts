// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

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

function translate(key: string, options?: { defaultValue?: string } & Record<string, unknown>): string {
  const languageResource = resources[currentLanguage] ?? resources[DEFAULT_LANG];
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, languageResource) as TranslationValue | undefined;

  if (typeof value === "string") {
    if (!options) return value;
    return value.replace(/\{\{(\w+)\}\}/g, (_match, k: string) => {
      const replacement = options[k];
      return replacement === undefined || replacement === null ? "" : String(replacement);
    });
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