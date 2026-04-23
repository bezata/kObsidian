#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
/**
 * Build a `.mcpb` bundle (ZIP with STORE compression) containing the
 * manifest and the compiled kobsidian binary. No external deps; uses
 * Node's built-in zlib.crc32 and a minimal ZIP writer.
 */
import { crc32 } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value, 0);
  return buffer;
}

async function collectFiles(manifestPath, binaryPath) {
  const entries = [];
  entries.push({
    archiveName: "manifest.json",
    body: await fs.readFile(manifestPath),
  });
  try {
    entries.push({
      archiveName: "dist/kobsidian",
      body: await fs.readFile(binaryPath),
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(
        `[make-mcpb] compiled binary not found at ${binaryPath}. Run "bun run build:compile" first.`,
      );
      process.exit(1);
    }
    throw error;
  }
  return entries;
}

function buildZipStore(entries) {
  const local = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.archiveName, "utf8");
    const crc = crc32(entry.body);
    const size = entry.body.length;

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: STORE (0)
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuffer.length),
      u16(0), // extra field length
    ]);

    local.push(localHeader, nameBuffer, entry.body);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuffer.length),
      u16(0), // extra
      u16(0), // comment
      u16(0), // disk number
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(offset),
      nameBuffer,
    ]);
    central.push(centralHeader);

    offset += localHeader.length + nameBuffer.length + entry.body.length;
  }

  const localPart = Buffer.concat(local);
  const centralPart = Buffer.concat(central);
  const centralOffset = localPart.length;
  const endRecord = Buffer.concat([
    u32(0x06054b50),
    u16(0), // disk
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralPart.length),
    u32(centralOffset),
    u16(0), // comment length
  ]);

  return Buffer.concat([localPart, centralPart, endRecord]);
}

async function main() {
  const manifestPath = path.join(REPO_ROOT, "manifest.json");
  const binaryPath = path.join(
    REPO_ROOT,
    "dist",
    process.platform === "win32" ? "kobsidian.exe" : "kobsidian",
  );
  const outputPath = path.join(REPO_ROOT, "kobsidian.mcpb");

  const entries = await collectFiles(manifestPath, binaryPath);
  const zip = buildZipStore(entries);
  await fs.writeFile(outputPath, zip);
  console.log(
    `[make-mcpb] wrote ${outputPath} (${zip.length.toLocaleString()} bytes, ${entries.length} entries)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
