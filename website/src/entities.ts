import implementations from "../../data/implementations.json" with { type: "json" };
import { LANGUAGES, LANGUAGE_CLASSES, LANGUAGE_COLORS } from "./languages.ts";
import { PACKAGE_SERVICES, SERVICE_NAMES } from "./package-services.ts";
import type { Metric } from "./metrics.ts";
export const IMPLEMENTATIONS = implementations.implementations;
export const IMPLEMENTATION_NAMES = IMPLEMENTATIONS.map((item) => item.name);
export function metricEntities(metric: Metric): string[] {
  return metric === "packages.published"
    ? SERVICE_NAMES
    : metric === "releases.stable"
      ? IMPLEMENTATION_NAMES
      : LANGUAGES;
}
export function entityDetails(
  metric: Metric,
  name: string,
): { url: string; languages: string } | undefined {
  const item =
    metric === "packages.published"
      ? PACKAGE_SERVICES.find((item) => item.name === name)
      : metric === "releases.stable"
        ? IMPLEMENTATIONS.find((item) => item.name === name)
        : undefined;
  return item
    ? { url: item.url, languages: item.languages.join(", ") }
    : undefined;
}
export function seriesStyle(
  metric: Metric,
  name: string,
): { id: string; color: string } {
  const implementation =
    metric === "releases.stable"
      ? IMPLEMENTATIONS.find((item) => item.name === name)
      : undefined;
  return implementation
    ? { id: implementation.id, color: implementation.color }
    : { id: LANGUAGE_CLASSES[name]!, color: LANGUAGE_COLORS[name]! };
}
