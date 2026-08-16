import {
  russianProviderCapabilities,
  validateRussianProviderCapabilities,
} from "../app/discovery/provider-capabilities.ts";

validateRussianProviderCapabilities();

const providers = [
  {
    id: "openalex",
    status: "enabled",
    protocol: "REST JSON",
    interface: "https://api.openalex.org/works",
  },
  {
    id: "crossref",
    status: "enabled",
    protocol: "REST JSON",
    interface: "https://api.crossref.org/works",
  },
  ...russianProviderCapabilities.map((provider) => ({
    id: provider.id,
    status: provider.status === "IMPLEMENT" ? "enabled" : provider.status.toLocaleLowerCase("en-US"),
    protocol: provider.protocol,
    interface: provider.searchInterface,
  })),
];

console.log("PLAST DISCOVERY PROVIDERS\n");
for (const provider of providers) {
  console.log(`${provider.id.padEnd(20)} ${provider.status.padEnd(20)} ${provider.protocol}`);
  console.log(`${"".padEnd(42)} ${provider.interface}`);
}
