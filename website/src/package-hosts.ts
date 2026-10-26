import model from "../../data/package-hosts.json" with { type: "json" };
export const PACKAGE_HOSTS = model.hosts;
export const PACKAGE_SELECTION = model.selection;
export const HOST_NAMES = PACKAGE_HOSTS.map((host) => host.name);
export const HOST_URLS = Object.fromEntries(
  PACKAGE_HOSTS.map((host) => [host.name, host.url]),
);
