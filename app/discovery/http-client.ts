export interface JsonRequestPolicy {
  timeoutMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

export class DiscoveryHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "DiscoveryHttpError";
    this.status = status;
  }
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(value: string | null, now = Date.now()) {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export async function requestJson(url: URL, init: RequestInit, policy: JsonRequestPolicy): Promise<unknown> {
  const fetchImpl = policy.fetchImpl ?? fetch;
  const sleep = policy.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 0; attempt < policy.maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), policy.timeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLocaleLowerCase("en-US").includes("json")) {
          throw new DiscoveryHttpError("Provider returned a non-JSON response", response.status);
        }
        return await response.json();
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable) throw new DiscoveryHttpError(`Provider request failed with HTTP ${response.status}`, response.status);
      lastError = new DiscoveryHttpError(`Temporary provider error HTTP ${response.status}`, response.status);
      if (attempt + 1 >= policy.maxRetries) break;
      const retryAfter = retryAfterMilliseconds(response.headers.get("retry-after"));
      await sleep(retryAfter ?? policy.retryBaseDelayMs * 2 ** attempt);
    } catch (error) {
      if (error instanceof DiscoveryHttpError && error.status !== undefined && error.status < 500 && error.status !== 429) {
        throw error;
      }
      lastError = error;
      if (attempt + 1 >= policy.maxRetries) break;
      await sleep(policy.retryBaseDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown network error");
  throw new DiscoveryHttpError(`Provider request failed after ${policy.maxRetries} attempts: ${message}`);
}
