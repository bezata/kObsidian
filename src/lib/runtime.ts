export const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
