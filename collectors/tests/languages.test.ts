import assert from "node:assert/strict";
import test from "node:test";
import { LANGUAGE_PROFILES } from "../src/languages.ts";
test("language profiles cover the reviewed GitHut top 20 with distinct IDs and tags", () => {
  assert.equal(LANGUAGE_PROFILES.length, 20);
  for (const field of ["name", "id", "stackoverflowTag"] as const)
    assert.equal(new Set(LANGUAGE_PROFILES.map((row) => row[field])).size, 20);
  assert.deepEqual(
    LANGUAGE_PROFILES.slice(0, 5).map((row) => row.name),
    ["Python", "Java", "Go", "JavaScript", "C++"],
  );
  assert.equal(LANGUAGE_PROFILES.at(-1)?.name, "Lua");
});
test("job-language aliases distinguish common ambiguous names", () => {
  const matches = (name: string, text: string) => {
    const row = LANGUAGE_PROFILES.find((row) => row.name === name)!;
    return new RegExp(row.mentionPattern, row.mentionFlags).test(text);
  };
  assert.equal(matches("Java", "JavaScript"), false);
  assert.equal(matches("Java", "Java / Kotlin"), true);
  assert.equal(matches("C", "C++ developer"), false);
  assert.equal(matches("C", "C# developer"), false);
  assert.equal(matches("C", "C programming"), true);
  assert.equal(matches("C++", "C++ developer"), true);
  assert.equal(matches("Go", "Go to our website"), false);
  assert.equal(matches("Go", "Python, Go, and Rust"), true);
  assert.equal(matches("Go", "golang backend"), true);
});
