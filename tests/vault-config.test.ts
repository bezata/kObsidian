import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveWikiHeadings } from "../src/domain/wiki/headings.js";
import { ingestSource } from "../src/domain/wiki/ingest.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { lintWiki } from "../src/domain/wiki/lint.js";
import { resolveWikiPaths } from "../src/domain/wiki/paths.js";
import { AppError } from "../src/lib/errors.js";
import { toolRegistry } from "../src/server/registry.js";
import { makeContext, makeTempVault } from "./helpers.js";

// Env values that must lose to the config file whenever the file sets a value.
const ENV_DECOYS = {
  KOBSIDIAN_WIKI_SOURCES_DIR: "Sources-ENV",
  KOBSIDIAN_WIKI_INDEX_SOURCES_HEADING: "Sources-ENV",
  KOBSIDIAN_WIKI_CONCEPT_PAGE_HEADING: "Discussion-ENV",
  KOBSIDIAN_WIKI_ENTITY_PAGE_HEADING: "Facts-ENV",
  KOBSIDIAN_VAULT_DISCOVERY: "off",
};

const PT_CONFIG = {
  wiki: {
    root: "kb",
    sourcesDir: "Fontes",
    staleDays: 30,
    headings: {
      indexSources: "Fontes",
      indexConcepts: "Conceitos",
      indexEntities: "Entidades",
      conceptPage: "Discussão",
      entityPage: "Fatos Notáveis",
    },
  },
};

async function writeConfig(vault: string, config: unknown, name = ".kobsidian.json") {
  const file = path.join(vault, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    typeof config === "string" ? config : JSON.stringify(config, null, 2),
    "utf8",
  );
}

function expectAppError(fn: () => unknown, pattern: RegExp) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("invalid_argument");
    expect((error as AppError).message).toMatch(pattern);
    return;
  }
  throw new Error("expected an AppError");
}

describe("per-vault config file (.kobsidian.json)", () => {
  it("overrides env for layout, headings, and staleDays; per-call args override the file", async () => {
    const vault = await makeTempVault();
    await writeConfig(vault, PT_CONFIG);
    const context = makeContext(vault, ENV_DECOYS);

    const paths = resolveWikiPaths(context, {});
    expect(paths.rootRelative).toBe("kb");
    expect(paths.sourcesRelative).toBe("kb/Fontes");
    expect(paths.conceptsRelative).toBe("kb/Concepts");

    await initWiki(context, {});
    const index = await fs.readFile(path.join(vault, "kb", "index.md"), "utf8");
    expect(index).toContain("## Fontes");
    expect(index).toContain("## Conceitos");
    expect(index).toContain("## Entidades");
    expect(index).not.toContain("Sources-ENV");

    await fs.writeFile(
      path.join(vault, "kb", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Definição\n\n## Discussão\n\n## Relacionados\n",
      "utf8",
    );
    const result = await ingestSource(context, {
      title: "Como Pensamos",
      content: "c",
      sourceType: "paper",
      summary: "s",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex", "Novo"],
      relatedEntities: ["Bush"],
    });
    const byPath = new Map(result.proposedEdits.map((p) => [p.path, p]));
    expect(result.sourcePage).toBe("kb/Fontes/como-pensamos.md");
    expect(byPath.get("kb/index.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Fontes",
    });
    expect(byPath.get("kb/Concepts/memex.md")).toMatchObject({ heading: "Discussão" });
    expect(byPath.get("kb/Concepts/novo.md")?.suggestedContent).toContain("## Discussão");
    expect(byPath.get("kb/Entities/bush.md")?.suggestedContent).toContain("## Fatos Notáveis");

    const overridden = await ingestSource(context, {
      title: "Outra",
      content: "c",
      sourceType: "note",
      summary: "s",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Outro"],
      conceptHeading: "Notas",
    });
    expect(
      overridden.proposedEdits.find((p) => p.path === "kb/Concepts/outro.md")?.suggestedContent,
    ).toContain("## Notas");

    const lint = await lintWiki(context, {});
    expect(lint.staleDays).toBe(30);
    expect((await lintWiki(context, { staleDays: 7 })).staleDays).toBe(7);
  });

  it("falls back to env, then defaults, when the file is absent", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault, ENV_DECOYS);
    expect(resolveWikiPaths(context, {}).sourcesRelative).toBe("wiki/Sources-ENV");
    expect(resolveWikiHeadings(context, {})).toEqual({
      indexSources: "Sources-ENV",
      indexConcepts: "Concepts",
      indexEntities: "Entities",
      concept: "Discussion-ENV",
      entity: "Facts-ENV",
    });
  });

  it("rejects malformed JSON with an invalid_argument error naming the file", async () => {
    const vault = await makeTempVault();
    await writeConfig(vault, "{ not json");
    const context = makeContext(vault);
    expectAppError(
      () => resolveWikiPaths(context, {}),
      /Could not parse \.kobsidian\.json \(.*\) as JSON/,
    );
  });

  it("rejects unknown keys so typos surface instead of silently doing nothing", async () => {
    const vault = await makeTempVault();
    await writeConfig(vault, { wiki: { headinsg: { conceptPage: "X" } } });
    const context = makeContext(vault);
    expectAppError(() => resolveWikiHeadings(context, {}), /Invalid \.kobsidian\.json .*headinsg/);
  });

  it("picks up edits to the file without a restart", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault, ENV_DECOYS);
    await writeConfig(vault, { wiki: { headings: { indexSources: "A" } } });
    expect(resolveWikiHeadings(context, {}).indexSources).toBe("A");
    await writeConfig(vault, { wiki: { headings: { indexSources: "Bee-longer" } } });
    expect(resolveWikiHeadings(context, {}).indexSources).toBe("Bee-longer");
    await fs.rm(path.join(vault, ".kobsidian.json"));
    expect(resolveWikiHeadings(context, {}).indexSources).toBe("Sources-ENV");
  });

  it("honors KOBSIDIAN_VAULT_CONFIG_FILE for a non-default location", async () => {
    const vault = await makeTempVault();
    await writeConfig(vault, PT_CONFIG, "config/kobsidian.json");
    const context = makeContext(vault, { KOBSIDIAN_VAULT_CONFIG_FILE: "config/kobsidian.json" });
    expect(resolveWikiPaths(context, {}).rootRelative).toBe("kb");
    expect(resolveWikiHeadings(context, {}).entity).toBe("Fatos Notáveis");
  });

  it("vault.current reports the effective configuration, or the error", async () => {
    const vault = await makeTempVault();
    const tool = toolRegistry.find((t) => t.name === "vault.current");
    if (!tool) throw new Error("vault.current not registered");

    await writeConfig(vault, PT_CONFIG);
    const ok = (await tool.handler(makeContext(vault, ENV_DECOYS), {})) as {
      config: { file: string; exists: boolean; wiki?: Record<string, unknown>; error?: string };
    };
    expect(ok.config).toMatchObject({
      file: ".kobsidian.json",
      exists: true,
      wiki: {
        root: "kb",
        sourcesDir: "Fontes",
        conceptsDir: "Concepts",
        staleDays: 30,
        headings: {
          indexSources: "Fontes",
          conceptPage: "Discussão",
          entityPage: "Fatos Notáveis",
        },
      },
    });

    await writeConfig(vault, "{ broken");
    const broken = (await tool.handler(makeContext(vault, ENV_DECOYS), {})) as {
      config: { exists: boolean; error?: string };
    };
    expect(broken.config.exists).toBe(true);
    expect(broken.config.error).toMatch(/Could not parse \.kobsidian\.json/);
  });
});
