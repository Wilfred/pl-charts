import model from "../../data/package-services.json" with { type: "json" };
export const PACKAGE_SERVICES = model.services;
export const PACKAGE_SELECTION = model.selection;
export const SERVICE_NAMES = PACKAGE_SERVICES.map((service) => service.name);
export const SERVICE_URLS = Object.fromEntries(
  PACKAGE_SERVICES.map((service) => [service.name, service.url]),
);

export const SERVICE_LANGUAGES = Object.fromEntries(
  PACKAGE_SERVICES.map((service) => [
    service.name,
    service.languages.join(", "),
  ]),
);
