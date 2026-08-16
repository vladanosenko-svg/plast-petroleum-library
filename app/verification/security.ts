export function isSafePublicHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) return false;
    if (hostname === "::" || hostname === "::1" || hostname.startsWith("fe80:") || /^(?:fc|fd)[0-9a-f]{2}:/u.test(hostname)) return false;
    if (/^(?:0|127)\./u.test(hostname) || /^10\./u.test(hostname) || /^169\.254\./u.test(hostname) || /^192\.168\./u.test(hostname)) return false;
    const match = hostname.match(/^172\.(\d{1,3})\./u);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return false;
    const shared = hostname.match(/^100\.(\d{1,3})\./u);
    if (shared && Number(shared[1]) >= 64 && Number(shared[1]) <= 127) return false;
    if (/^198\.(?:18|19)\./u.test(hostname)) return false;
    const firstOctet = Number(hostname.split(".")[0]);
    if (Number.isInteger(firstOctet) && firstOctet >= 224) return false;
    return true;
  } catch {
    return false;
  }
}
