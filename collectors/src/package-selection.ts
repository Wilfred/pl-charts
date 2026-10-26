import model from "../../data/package-services.json" with { type: "json" };
export const PACKAGE_SERVICES = model.services;
export const PACKAGE_SELECTION = model.selection;
export function modulecountsSelection(body: string) {
  const rates = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(
    (match) => {
      const row = match[1]!;
      const name = row.match(/<a\b[^>]*>([^<]+)<\/a>/i)?.[1]?.trim();
      const rate = row.match(/(-?\d+)\/day/);
      return name && rate ? [{ name, packagesPerDay: Number(rate[1]) }] : [];
    },
  );
  if (!rates.length) throw new Error("Modulecounts growth table was not found");
  const qualifying = rates.filter(
    (row) => row.packagesPerDay >= PACKAGE_SELECTION.minimumPackagesPerDay,
  );
  for (const row of qualifying)
    if (
      !PACKAGE_SERVICES.some((service) =>
        service.modulecountsNames.includes(row.name),
      )
    )
      throw new Error(`Unreviewed qualifying package service: ${row.name}`);
  for (const service of PACKAGE_SERVICES)
    if (!qualifying.some((row) => service.modulecountsNames.includes(row.name)))
      throw new Error(
        `Package service does not meet the growth threshold: ${service.name}`,
      );
  return {
    ...PACKAGE_SELECTION,
    rows: rates,
    services: PACKAGE_SERVICES.map((service) => service.id),
  };
}
