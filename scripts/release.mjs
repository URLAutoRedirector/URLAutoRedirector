#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { parse, stringify } from "yaml";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function extensionVersion(projectDir = rootDir) {
  const manifest = JSON.parse(await readFile(path.join(projectDir, "src/manifest.json"), "utf8"));
  return manifest.version;
}

export function parseArgs(argv) {
  const options = { command: argv[0], force: false, count: 1 };

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") options.force = true;
    else if (argument === "--count" || argument === "-n") {
      options.count = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (argument.startsWith("--count=")) {
      options.count = Number.parseInt(argument.slice("--count=".length), 10);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!Number.isInteger(options.count) || options.count < 1) {
    throw new Error("--count must be a positive integer");
  }
  return options;
}

async function removeFinderMetadata(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await removeFinderMetadata(entryPath);
    else if (entry.name === ".DS_Store") await rm(entryPath);
  }));
}

export async function build({ projectDir = rootDir, force = false } = {}) {
  const version = await extensionVersion(projectDir);
  const sourceDir = path.join(projectDir, "src");
  const distDir = path.join(projectDir, "dist");
  const outputPath = path.join(distDir, `UrlAutoRedirector-${version}.zip`);

  await mkdir(distDir, { recursive: true });
  if (!force) {
    try {
      await access(outputPath);
      throw new Error(`${path.basename(outputPath)} already exists; pass --force to replace it`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  await removeFinderMetadata(sourceDir);
  if (force) await rm(outputPath, { force: true });

  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });

  return outputPath;
}

export async function tag({ projectDir = rootDir } = {}) {
  const version = await extensionVersion(projectDir);
  execFileSync("git", ["tag", version], { cwd: projectDir, stdio: "inherit" });
  execFileSync("git", ["push", "origin", version], { cwd: projectDir, stdio: "inherit" });
  return version;
}

export function recentChanges({ projectDir = rootDir, count = 1 } = {}) {
  const output = execFileSync(
    "git",
    ["log", "-n", String(count), "--pretty=format:%h%x00%s"],
    { cwd: projectDir, encoding: "utf8" },
  );
  if (!output) return [];
  return output.split("\n").map((line) => {
    const [hash, text] = line.split("\0");
    return { text, hash };
  });
}

export async function changelog({
  projectDir = rootDir,
  websiteDir = process.env.UAR_WEBSITE_DIR ?? path.resolve(rootDir, "../urlautoredirector.github.io"),
  count = 1,
} = {}) {
  const version = await extensionVersion(projectDir);
  const changelogPath = path.join(websiteDir, "_data/changelog.yml");
  const source = await readFile(changelogPath, "utf8");
  const entries = parse(source);
  if (!Array.isArray(entries)) throw new Error(`${changelogPath} must contain a YAML list`);

  const newEntry = { version, changes: recentChanges({ projectDir, count }) };
  const existingIndex = entries.findIndex((entry) => String(entry.version) === version);
  if (existingIndex !== -1) {
    console.warn(`Changelog already contains version ${version}; replacing it.`);
    entries.splice(existingIndex, 1);
    entries.unshift(newEntry);
    await writeFile(changelogPath, `---\n${stringify(entries, { lineWidth: 0 })}`, "utf8");
    return changelogPath;
  }

  const existingEntries = source.replace(/^---\s*\n/, "");
  await writeFile(
    changelogPath,
    `---\n${stringify([newEntry], { lineWidth: 0 })}${existingEntries}`,
    "utf8",
  );
  return changelogPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let result;
  if (options.command === "build") result = await build(options);
  else if (options.command === "tag") result = await tag(options);
  else if (options.command === "changelog") result = await changelog(options);
  else throw new Error("Usage: release.mjs <build|tag|changelog> [--force] [--count N]");
  console.log(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
