const baseUrl = (process.env.PLAST_LIVE_URL ?? "https://plast-petroleum-library.vlad-anosenko.chatgpt.site").replace(/\/$/, "");
const sitesAuthToken = process.env.PLAST_SITES_AUTH_TOKEN;
const routes = [
  "/",
  "/library",
  "/topics",
  "/courses",
  "/about",
  "/library/reservoir-engineering",
  "/library/reservoir-engineering/read",
];
let failed = false;

for (const route of routes) {
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      redirect: "follow",
      headers: sitesAuthToken ? { "OAI-Sites-Authorization": `Bearer ${sitesAuthToken}` } : undefined,
    });
    console.log(`${response.status} ${route}`);
    if (response.status !== 200) failed = true;
  } catch (error) {
    failed = true;
    console.error(`ERROR ${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exitCode = 1;
