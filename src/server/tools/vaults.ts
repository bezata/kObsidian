import type { DomainContext } from "../../domain/context.js";
import { applyAllowDeny, discoverVaults, resolveSelector } from "../../domain/vaults.js";
import { AppError } from "../../lib/errors.js";
import {
  type VaultCurrentArgs,
  type VaultListArgs,
  type VaultRecord,
  type VaultResetArgs,
  type VaultSelectArgs,
  vaultCurrentArgsSchema,
  vaultCurrentOutputSchema,
  vaultListArgsSchema,
  vaultListOutputSchema,
  vaultResetArgsSchema,
  vaultResetOutputSchema,
  vaultSelectArgsSchema,
  vaultSelectOutputSchema,
} from "../../schema/vaults.js";
import type { ToolDefinition } from "../tool-definition.js";
import { ADDITIVE, IDEMPOTENT_ADDITIVE, READ_ONLY } from "../tool-schemas.js";

const CACHE_TTL_MS = 30_000;

async function ensureDiscovered(context: DomainContext, refresh = false) {
  const now = Date.now();
  if (refresh || !context.vaults.result || now - context.vaults.lastRefreshedAt > CACHE_TTL_MS) {
    const result = await discoverVaults(context.env, context.session.activeVault?.id ?? null);
    context.vaults.lastRefreshedAt = now;
    context.vaults.result = result;
  }
  return context.vaults.result;
}

function obsidianLiveInstance(context: DomainContext) {
  if (!context.env.OBSIDIAN_API_URL || !context.api.isConfigured) return undefined;
  return {
    apiUrl: context.env.OBSIDIAN_API_URL,
    note: "workspace.* and commands.* tools operate on the vault the live Obsidian process has open, independent of the filesystem vault selected by vault.select.",
  };
}

function activeRecord(
  context: DomainContext,
  records: VaultRecord[],
): {
  active: VaultRecord | null;
  reason: "session-selected" | "env-default" | "none";
} {
  if (context.session.activeVault) {
    return { active: context.session.activeVault, reason: "session-selected" };
  }
  const defaultPath = context.env.OBSIDIAN_VAULT_PATH;
  if (defaultPath) {
    const found = records.find((r) => r.isDefault) ?? null;
    return { active: found, reason: "env-default" };
  }
  return { active: null, reason: "none" };
}

export const vaultTools: ToolDefinition[] = [
  {
    name: "vault.list",
    title: "List Known Vaults",
    description:
      "List every Obsidian vault kObsidian knows about, merged and deduplicated across three sources: the operator's OBSIDIAN_VAULT_PATH (the default — always included), any OBSIDIAN_VAULT_<NAME>=path env vars (explicit named vaults), and — when KOBSIDIAN_VAULT_DISCOVERY is `on` (the default) — the user's local Obsidian application registry at obsidian.json. Each item reports its `source`, `isDefault`, `isActive`, and `exists` so the LLM can flag stale or missing vaults. Pass `refresh: true` to force a fresh scan instead of using the 30s cache. Read-only. NOTE: the `obsidian-app` source is EXPERIMENTAL — it parses Obsidian's undocumented obsidian.json registry (stable since 1.0 but internal to Obsidian) and may silently stop returning results if Obsidian changes the format; the env-var sources are the documented, stable path.",
    inputSchema: vaultListArgsSchema,
    outputSchema: vaultListOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = vaultListArgsSchema.parse(rawArgs) as VaultListArgs;
      const result = await ensureDiscovered(context, args.refresh === true);
      return {
        total: result.records.length,
        items: result.records,
        activeVaultId: context.session.activeVault?.id ?? null,
        obsidianConfigPath: result.obsidianConfigPath,
        ...(result.obsidianConfigError ? { obsidianConfigError: result.obsidianConfigError } : {}),
      };
    },
    inputExamples: [
      { description: "List vaults using the 30-second cache", input: {} },
      {
        description: "Force a rescan (obsidian.json changed, new env vars added)",
        input: { refresh: true },
      },
    ],
  },
  {
    name: "vault.current",
    title: "Current Active Vault",
    description:
      "Return the vault that filesystem tools (notes.*, tags.*, dataview.*, blocks.*, canvas.*, kanban.*, marp.*, templates.*, tasks.*, links.*, wiki.*, stats.vault) would resolve to right now, plus the full precedence chain so the LLM can explain to the user why that vault was picked. `reason` is `session-selected` (vault.select was called), `env-default` (fell back to OBSIDIAN_VAULT_PATH), or `none` (nothing configured — tools will fail until vault.select or an env var is set). When OBSIDIAN_API_URL is configured, the response also carries an `obsidianLiveInstance` note reminding the caller that workspace.* and commands.* tools target whichever vault the live Obsidian process has open, NOT the filesystem vault selected here. Read-only.",
    inputSchema: vaultCurrentArgsSchema,
    outputSchema: vaultCurrentOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      vaultCurrentArgsSchema.parse(rawArgs) as VaultCurrentArgs;
      const result = await ensureDiscovered(context);
      const { active, reason } = activeRecord(context, result.records);
      return {
        active,
        reason,
        envDefault: context.env.OBSIDIAN_VAULT_PATH
          ? { path: context.env.OBSIDIAN_VAULT_PATH }
          : null,
        ...(obsidianLiveInstance(context)
          ? { obsidianLiveInstance: obsidianLiveInstance(context) }
          : {}),
      };
    },
  },
  {
    name: "vault.select",
    title: "Select Active Vault",
    description:
      "Set the session-active vault for subsequent filesystem tool calls. Identify the target by EXACTLY ONE of `id` (stable id from vault.list), `name` (case-insensitive match), or `path` (absolute directory path — need not appear in vault.list; lets the LLM point at a fresh/empty vault to initialise). Precedence chain becomes: per-call `vaultPath` argument (highest) → this session selection → OBSIDIAN_VAULT_PATH → error. Explicit `vaultPath` arguments on individual tool calls always override this selection. Respects KOBSIDIAN_VAULT_ALLOW / KOBSIDIAN_VAULT_DENY operator gating (though OBSIDIAN_VAULT_PATH is never filtered). Does NOT change which vault the live Obsidian process has open — `workspace.*` and `commands.*` tools remain tied to OBSIDIAN_API_URL. HTTP deployments: this server shares the selection across HTTP clients, so concurrent multi-client HTTP setups should pass `vaultPath` per call instead.",
    inputSchema: vaultSelectArgsSchema,
    outputSchema: vaultSelectOutputSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = vaultSelectArgsSchema.parse(rawArgs) as VaultSelectArgs;
      const discovered = await ensureDiscovered(context);
      // Resolve against the UNGATED pool so we can distinguish
      // "vault exists but is blocked by operator gating" (unauthorized) from
      // "vault doesn't exist" (not_found) — better error UX than collapsing
      // both to not_found.
      const candidateRecord = await resolveSelector(
        { id: args.id, name: args.name, path: args.path },
        discovered.ungatedRecords,
      );
      const [gated] = applyAllowDeny([candidateRecord], context.env);
      if (!gated) {
        throw new AppError(
          "unauthorized",
          `Vault "${candidateRecord.name}" is blocked by KOBSIDIAN_VAULT_ALLOW / KOBSIDIAN_VAULT_DENY.`,
        );
      }
      const previous = context.session.activeVault;
      const next: VaultRecord = { ...gated, isActive: true };
      context.session.activeVault = next;
      return {
        changed: previous?.path !== next.path,
        target: next.path,
        summary: `Active vault set to "${next.name}" (${next.path})`,
        active: next,
        previous,
      };
    },
    inputExamples: [
      { description: "Switch to the vault named 'Work'", input: { name: "Work" } },
      { description: "Select by id from vault.list", input: { id: "58f115bd2c2febd2" } },
      {
        description: "Point at an ad-hoc path (e.g. a fresh vault to initialise)",
        input: { path: "/Users/alice/FreshVault" },
      },
    ],
  },
  {
    name: "vault.reset",
    title: "Reset Active Vault Selection",
    description:
      "Clear the session-selected vault so the precedence chain falls back to OBSIDIAN_VAULT_PATH. Use this to signal 'I'm done with the scratch vault, go back to the default'. Idempotent — running on an already-cleared session is a no-op that reports `changed: false`. Does not change per-call `vaultPath` behaviour.",
    inputSchema: vaultResetArgsSchema,
    outputSchema: vaultResetOutputSchema,
    annotations: IDEMPOTENT_ADDITIVE,
    handler: async (context, rawArgs) => {
      vaultResetArgsSchema.parse(rawArgs) as VaultResetArgs;
      const previous = context.session.activeVault;
      context.session.activeVault = null;
      return {
        changed: previous !== null,
        target: context.env.OBSIDIAN_VAULT_PATH ?? "",
        summary: previous
          ? `Active vault selection cleared (was "${previous.name}")`
          : "No active vault selection to clear",
        previous,
      };
    },
  },
];
