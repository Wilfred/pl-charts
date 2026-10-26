export const LANGUAGES = [
  "JavaScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "Ruby",
] as const;
export type Language = (typeof LANGUAGES)[number];
export type LanguageCounts = Record<Language, number>;
export const LANGUAGE_CLASSES: Record<Language, string> = {
  JavaScript: "js",
  Python: "py",
  Java: "java",
  Go: "go",
  Rust: "rust",
  Ruby: "ruby",
};
