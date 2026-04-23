import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DomainContext } from "../domain/context.js";
import { resolveWikiPaths } from "../domain/wiki/paths.js";
import { AppError } from "../lib/errors.js";
import { fileExists, readUtf8, walkMarkdownFiles } from "../lib/filesystem.js";
import { toVaultRelativePath } from "../lib/paths.js";

const STATIC_RESOURCE_MIME = "text/markdown";

async function listWikiPagesForCategory(
  absoluteCategoryDir: string,
  vaultRoot: string,
  wikiRoot: string,
): Promise<string[]> {
  if (!(await fileExists(absoluteCategoryDir))) return [];
  const absolutes = await walkMarkdownFiles(absoluteCategoryDir);
  const wikiPrefix = `${wikiRoot}/`;
  return absolutes
    .map((absolute) => toVaultRelativePath(vaultRoot, absolute))
    .map((relative) =>
      relative.startsWith(wikiPrefix) ? relative.slice(wikiPrefix.length) : relative,
    )
    .sort();
}

async function readStaticWikiFile(
  context: DomainContext,
  uri: string,
  selector: "indexAbsolute" | "logAbsolute" | "schemaAbsolute",
  relativeKey: "indexRelative" | "logRelative" | "schemaRelative",
) {
  const paths = resolveWikiPaths(context);
  const absolute = paths[selector];
  if (!(await fileExists(absolute))) {
    throw new AppError(
      "not_found",
      `Wiki not initialized: ${paths[relativeKey]} does not exist. Run wiki.init first.`,
    );
  }
  const text = await readUtf8(absolute);
  return {
    contents: [
      {
        uri,
        mimeType: STATIC_RESOURCE_MIME,
        text,
      },
    ],
  };
}

export function registerWikiResources(server: McpServer, context: DomainContext): void {
  server.registerResource(
    "wiki-index",
    "kobsidian://wiki/index",
    {
      title: "Wiki Index",
      description:
        "Top-level catalog of wiki pages, grouped by Sources / Concepts / Entities. Regenerate with the wiki.indexRebuild tool.",
      mimeType: STATIC_RESOURCE_MIME,
    },
    async (uri) => readStaticWikiFile(context, uri.toString(), "indexAbsolute", "indexRelative"),
  );

  server.registerResource(
    "wiki-log",
    "kobsidian://wiki/log",
    {
      title: "Wiki Log",
      description:
        "Chronological, append-only log of wiki activity. Each entry starts with '## [YYYY-MM-DD] <op> | <title>'.",
      mimeType: STATIC_RESOURCE_MIME,
    },
    async (uri) => readStaticWikiFile(context, uri.toString(), "logAbsolute", "logRelative"),
  );

  server.registerResource(
    "wiki-schema",
    "kobsidian://wiki/schema",
    {
      title: "Wiki Schema",
      description:
        "Frontmatter contracts and operational conventions for this wiki (seeded by wiki.init). Source of truth for how the wiki is structured.",
      mimeType: STATIC_RESOURCE_MIME,
    },
    async (uri) => readStaticWikiFile(context, uri.toString(), "schemaAbsolute", "schemaRelative"),
  );

  server.registerResource(
    "wiki-page",
    new ResourceTemplate("kobsidian://wiki/page/{+path}", {
      list: async () => {
        const paths = resolveWikiPaths(context);
        if (!(await fileExists(paths.rootAbsolute))) {
          return { resources: [] };
        }
        const categories: Array<{
          label: "Source" | "Concept" | "Entity";
          absolute: string;
        }> = [
          { label: "Source", absolute: paths.sourcesAbsolute },
          { label: "Concept", absolute: paths.conceptsAbsolute },
          { label: "Entity", absolute: paths.entitiesAbsolute },
        ];
        const resources: Array<{
          uri: string;
          name: string;
          mimeType: string;
          description: string;
        }> = [];
        for (const category of categories) {
          const files = await listWikiPagesForCategory(
            category.absolute,
            paths.vaultRoot,
            paths.rootRelative,
          );
          for (const relativeToWiki of files) {
            const display = path.basename(relativeToWiki, path.extname(relativeToWiki));
            resources.push({
              uri: `kobsidian://wiki/page/${relativeToWiki}`,
              name: `${category.label}: ${display}`,
              mimeType: STATIC_RESOURCE_MIME,
              description: `${paths.rootRelative}/${relativeToWiki}`,
            });
          }
        }
        return { resources };
      },
    }),
    {
      title: "Wiki Page",
      description:
        "Read a specific wiki page by its path under the wiki root — e.g. kobsidian://wiki/page/Sources/<slug>.md.",
      mimeType: STATIC_RESOURCE_MIME,
    },
    async (uri, variables) => {
      const paths = resolveWikiPaths(context);
      const rawPath = Array.isArray(variables.path) ? variables.path.join("/") : variables.path;
      const cleaned = String(rawPath ?? "").replaceAll("\\", "/");
      if (!cleaned || cleaned.includes("..")) {
        throw new AppError("invalid_argument", `Invalid wiki page path: ${rawPath}`);
      }
      const absolute = path.join(paths.rootAbsolute, cleaned);
      if (!(await fileExists(absolute))) {
        throw new AppError("not_found", `Wiki page not found: ${paths.rootRelative}/${cleaned}`);
      }
      const text = await readUtf8(absolute);
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: STATIC_RESOURCE_MIME,
            text,
          },
        ],
      };
    },
  );
}
