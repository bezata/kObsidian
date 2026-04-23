import { AppError } from "./errors.js";

export type ObsidianApiClientOptions = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  verifyTls?: boolean;
};

export class ObsidianApiClient {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly timeoutMs: number;
  readonly verifyTls: boolean;

  constructor(options: ObsidianApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.verifyTls = options.verifyTls ?? false;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async request<T>(pathname: string, init: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new AppError("unavailable", "OBSIDIAN_REST_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const requestInit: RequestInit & { tls?: { rejectUnauthorized: boolean } } = {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        ...(this.verifyTls ? {} : { tls: { rejectUnauthorized: false } }),
      };
      const response = await fetch(`${this.baseUrl}${pathname}`, requestInit);

      if (response.status === 401 || response.status === 403) {
        throw new AppError("unauthorized", `Obsidian API request was rejected: ${pathname}`);
      }

      if (response.status === 404) {
        throw new AppError("not_found", `Obsidian API resource not found: ${pathname}`);
      }

      if (!response.ok) {
        throw new AppError(
          "unavailable",
          `Obsidian API request failed: ${response.status} ${pathname}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return (await response.json()) as T;
      }

      return (await response.text()) as T;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("unavailable", `Unable to reach Obsidian API at ${this.baseUrl}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkAvailable(): Promise<boolean> {
    try {
      await this.request("/vault/");
      return true;
    } catch {
      return false;
    }
  }
}
