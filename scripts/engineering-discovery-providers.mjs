import {
  academicDomainRegistry,
  engineeringProviderCapabilities,
  engineeringRegistryRecords,
  engineeringVendors,
  validateEngineeringRegistries,
} from "../app/discovery/engineering-registry.ts";

validateEngineeringRegistries();

console.log("ENGINEERING DISCOVERY PROVIDERS\n");
console.log("Provider                       Group                    Policy                 Curated");
for (const provider of engineeringProviderCapabilities) {
  console.log(`${provider.label.padEnd(30)} ${provider.group.padEnd(24)} ${provider.status.padEnd(22)} ${provider.curatedRegistry ? "yes" : "no"}`);
}
console.log(`\nVendors: ${engineeringVendors.length}`);
for (const vendor of engineeringVendors) console.log(`  ${vendor.name}: ${vendor.products.map((product) => product.current ? product.name : `${product.name} [legacy]`).join(", ")}`);
console.log(`\nAcademic/university whitelist: ${academicDomainRegistry.length}`);
for (const entry of academicDomainRegistry) console.log(`  ${entry.label} (${entry.officialDomain}) — ${entry.automationStatus}`);
console.log(`\nCurated engineering records: ${engineeringRegistryRecords.length}`);
