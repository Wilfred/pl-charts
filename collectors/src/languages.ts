import { readFileSync } from "node:fs";
export interface LanguageProfile {
  name: string;
  id: string;
  color: string;
  stackoverflowTag: string;
  surveyAliases: string[];
  mentionPattern: string;
  mentionFlags: string;
}
export const LANGUAGE_MODEL = JSON.parse(
  readFileSync(new URL("../../data/languages.json", import.meta.url), "utf8"),
) as {
  selection: {
    source: string;
    revision: string;
    metric: string;
    period: string;
  };
  languages: LanguageProfile[];
};
export const LANGUAGE_PROFILES = LANGUAGE_MODEL.languages;
