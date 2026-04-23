import { Agent, type Dispatcher } from "undici";
import { AppError } from "./errors.js";
import { isBun } from "./runtime.js";

export type ObsidianApiClientOptions = {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  verifyTls?: boolean;
};

type InsecureRequestInit = RequestInit & {
  tls?: { rejectUnauthorized: boolean };
  dispatcher?: Dispatcher;
};

export class ObsidianApiClient {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly timeoutMs: number;
  readonly verifyTls: boolean;
  private readonly insecureDispatcher: Dispatcher | undefined;

  constructor(options: ObsidianApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.verifyTls = options.verifyTls ?? false;
    this.insecureDispatcher =
      !this.verifyTls && !isBun ? new Agent({ connect: { rejectUnauthorized: false } }) : undefined;
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
      const requestInit: InsecureRequestInit = {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      };
      if (!this.verifyTls) {
        if (isBun) {
          requestInit.tls = { rejectUnauthorized: false };
        } else if (this.insecureDispatcher) {
          requestInit.dispatcher = this.insecureDispatcher;
        }
      }
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
      const detail = describeFetchError(error);
      throw new AppError(
        "unavailable",
        `Unable to reach Obsidian API at ${this.baseUrl}${detail ? ` (${detail})` : ""}`,
        { cause: error },
      );
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

function describeFetchError(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && code) return code;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && typeof cause === "object") {
    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string" && causeCode) return causeCode;
  }
  return undefined;
}
