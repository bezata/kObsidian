import { z } from "zod";

export const vaultSourceSchema = z
  .enum(["obsidian-app", "env-named", "env-default"])
  .describe(
    "Where kObsidian learned about this vault. `env-default` = OBSIDIAN_VAULT_PATH; `env-named` = an OBSIDIAN_VAULT_<NAME>=path env var; `obsidian-app` = parsed from the user's local Obsidian application config (obsidian.json).",
  );
export type VaultSource = z.infer<typeof vaultSourceSchema>;

export const vaultRecordSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Stable identifier. `obsidian-app` sources use the 16-char hex id Obsidian assigns; `env-named` uses `env:<name>`; `env-default` uses `default`.",
      ),
    name: z
      .string()
      .describe(
        "Human-readable label. `obsidian-app` + `env-default` sources derive from `path.basename`; `env-named` uses the env-var suffix lowercased.",
      ),
    path: z.string().describe("Absolute path to the vault directory."),
    isDefault: z
      .boolean()
      .describe("True if this vault matches OBSIDIAN_VAULT_PATH set at server startup."),
    isActive: z.boolean().describe("True if this vault is the currently session-selected vault."),
    source: vaultSourceSchema,
    lastOpened: z
      .string()
      .optional()
      .describe(
        "ISO timestamp of when the user last opened this vault in Obsidian. Only present for `obsidian-app` sources.",
      ),
    exists: z
      .boolean()
      .describe(
        "Whether the path exists on disk at discovery time. `false` flags stale obsidian.json entries (deleted vaults).",
      ),
  })
  .describe("A single vault entry returned by `vault.list` and `vault.current.active`.");
export type VaultRecord = z.infer<typeof vaultRecordSchema>;

export const vaultListArgsSchema = z
  .object({
    refresh: z
      .boolean()
      .optional()
      .describe(
        "When true, force a fresh scan of the filesystem and obsidian.json even if the cache is warm. Default false.",
      ),
  })
  .strict()
  .describe("Arguments for `vault.list`.");
export type VaultListArgs = z.input<typeof vaultListArgsSchema>;

export const vaultListOutputSchema = z
  .object({
    total: z.number().int().nonnegative(),
    items: z.array(vaultRecordSchema),
    activeVaultId: z
      .string()
      .nullable()
      .describe("Id of the currently session-selected vault, or null when using the env default."),
    obsidianConfigPath: z
      .string()
      .nullable()
      .describe(
        "Path to the obsidian.json file kObsidian successfully parsed, or null when no config file was found or discovery is disabled.",
      ),
    obsidianConfigError: z
      .string()
      .optional()
      .describe(
        "Present only when obsidian.json was located but could not be parsed. The string names the failure reason for debuggability.",
      ),
  })
  .describe("Return shape of `vault.list`.");

export const vaultCurrentArgsSchema = z
  .object({})
  .strict()
  .describe("Arguments for `vault.current` (none).");
export type VaultCurrentArgs = z.input<typeof vaultCurrentArgsSchema>;

export const vaultCurrentOutputSchema = z
  .object({
    active: vaultRecordSchema
      .nullable()
      .describe(
        "The vault filesystem tools would resolve to right now. Null only when neither a session selection nor OBSIDIAN_VAULT_PATH is set.",
      ),
    reason: z
      .enum(["session-selected", "env-default", "none"])
      .describe(
        "Why `active` resolved this way: `session-selected` = set by vault.select; `env-default` = fell back to OBSIDIAN_VAULT_PATH; `none` = nothing is configured.",
      ),
    envDefault: z
      .object({ path: z.string() })
      .nullable()
      .describe("The OBSIDIAN_VAULT_PATH value at server startup, if any."),
    obsidianLiveInstance: z
      .object({
        apiUrl: z.string(),
        note: z.string(),
      })
      .optional()
      .describe(
        "Present when OBSIDIAN_API_URL is configured. Explains that workspace.* and commands.* tools target the vault the live Obsidian process has open, independent of the filesystem vault selected here.",
      ),
  })
  .describe("Return shape of `vault.current`.");

// Selector for vault.select: exactly one of id, name, or path. Enforced via
// .refine() because Zod's discriminatedUnion requires a literal discriminant
// field, which we can't express when the discriminant is "which optional key
// is present".
export const vaultSelectArgsSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .optional()
      .describe("Vault id returned by `vault.list`. Mutually exclusive with `name` and `path`."),
    name: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Case-insensitive vault name match against `vault.list`. Mutually exclusive with `id` and `path`.",
      ),
    path: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Absolute vault directory path. Need not appear in `vault.list` — accepting an ad-hoc path lets the LLM point at a fresh vault. Must exist and be a directory. Mutually exclusive with `id` and `name`.",
      ),
  })
  .strict()
  .refine(
    (value) =>
      [value.id, value.name, value.path].filter((v) => typeof v === "string" && v.length > 0)
        .length === 1,
    {
      message: "Provide exactly one of `id`, `name`, or `path`",
    },
  )
  .describe("Arguments for `vault.select`.");
export type VaultSelectArgs = z.input<typeof vaultSelectArgsSchema>;

export const vaultSelectOutputSchema = z
  .object({
    changed: z.boolean(),
    target: z.string(),
    summary: z.string(),
    active: vaultRecordSchema,
    previous: vaultRecordSchema
      .nullable()
      .describe("The previously-selected vault, or null if none was selected."),
  })
  .describe("Return shape of `vault.select`.");

export const vaultResetArgsSchema = z
  .object({})
  .strict()
  .describe("Arguments for `vault.reset` (none).");
export type VaultResetArgs = z.input<typeof vaultResetArgsSchema>;

export const vaultResetOutputSchema = z
  .object({
    changed: z.boolean(),
    target: z.string(),
    summary: z.string(),
    previous: vaultRecordSchema.nullable(),
  })
  .describe("Return shape of `vault.reset`.");
