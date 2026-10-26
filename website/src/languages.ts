import profiles from "../../data/languages.json" with { type: "json" };
export const LANGUAGE_SELECTION = profiles.selection;
export const LANGUAGE_PROFILES = profiles.languages;
export const LANGUAGES = LANGUAGE_PROFILES.map((language) => language.name);
export type Language = string;
export type LanguageCounts = Record<Language, number | null>;
export const LANGUAGE_CLASSES = Object.fromEntries(
  LANGUAGE_PROFILES.map((language) => [language.name, language.id]),
);
export const LANGUAGE_COLORS = Object.fromEntries(
  LANGUAGE_PROFILES.map((language) => [language.name, language.color]),
);
