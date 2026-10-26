import model from "../../data/package-hosts.json" with { type: "json" };
export const PACKAGE_HOSTS = model.hosts;
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
      !PACKAGE_HOSTS.some((host) => host.modulecountsNames.includes(row.name))
    )
      throw new Error(`Unreviewed qualifying package host: ${row.name}`);
  for (const host of PACKAGE_HOSTS)
    if (!qualifying.some((row) => host.modulecountsNames.includes(row.name)))
      throw new Error(
        `Package host does not meet the growth threshold: ${host.name}`,
      );
  return {
    ...PACKAGE_SELECTION,
    rows: rates,
    hosts: PACKAGE_HOSTS.map((host) => host.id),
  };
}
