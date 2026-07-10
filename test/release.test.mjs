import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { build, changelog, parseArgs, recentChanges } from "../scripts/release.mjs";

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "uar-release-"));
  const projectDir = path.join(directory, "urlautoredirector");
  const websiteDir = path.join(directory, "urlautoredirector.github.io");
  await mkdir(path.join(projectDir, "src"), { recursive: true });
  await mkdir(path.join(websiteDir, "_data"), { recursive: true });
  await writeFile(path.join(projectDir, "src/manifest.json"), '{"version":"2.0.0"}');
  await writeFile(path.join(projectDir, "src/background.js"), "// extension");
  await writeFile(path.join(projectDir, "src/.DS_Store"), "metadata");
  await writeFile(
    path.join(websiteDir, "_data/changelog.yml"),
    "---\n- version: 1.0.0\n  changes:\n    - text: existing formatting\n      hash: abc1234\n",
  );
  execFileSync("git", ["init", "-q"], { cwd: projectDir });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: projectDir });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: projectDir });
  execFileSync("git", ["add", "."], { cwd: projectDir });
  execFileSync("git", ["commit", "-qm", "feat: test release"], { cwd: projectDir });
  return { projectDir, websiteDir };
}

test("parseArgs accepts release options", () => {
  assert.deepEqual(parseArgs(["build", "--force"]), { command: "build", force: true });
  assert.deepEqual(parseArgs(["changelog", "-n", "3"]), { command: "changelog", force: false, count: 3 });
});

test("recentChanges returns only commits after the latest tag", async () => {
  const { projectDir } = await fixture();
  execFileSync("git", ["tag", "1.0.0"], { cwd: projectDir });
  await writeFile(path.join(projectDir, "after-tag.txt"), "first");
  execFileSync("git", ["add", "."], { cwd: projectDir });
  execFileSync("git", ["commit", "-qm", "feat: first after tag"], { cwd: projectDir });
  await writeFile(path.join(projectDir, "after-tag.txt"), "second");
  execFileSync("git", ["commit", "-qam", "fix: second after tag"], { cwd: projectDir });

  assert.deepEqual(
    recentChanges({ projectDir }).map(({ text }) => text),
    ["fix: second after tag", "feat: first after tag"],
  );
  assert.deepEqual(
    recentChanges({ projectDir, count: 1 }).map(({ text }) => text),
    ["fix: second after tag"],
  );
});

test("build creates a versioned extension archive", async () => {
  const { projectDir } = await fixture();
  const output = await build({ projectDir });
  assert.equal(path.basename(output), "UrlAutoRedirector-2.0.0.zip");
  assert.ok((await readFile(output)).length > 0);
  await assert.rejects(build({ projectDir }), /already exists/);
});

test("changelog prepends commits and replaces a duplicate version", async () => {
  const { projectDir, websiteDir } = await fixture();
  const output = await changelog({ projectDir, websiteDir });
  let contents = await readFile(output, "utf8");
  assert.match(contents, /version: 2\.0\.0/);
  assert.match(contents, /text: "feat: test release"/);
  assert.match(contents, /    - text: existing formatting/);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    await changelog({ projectDir, websiteDir });
  } finally {
    console.warn = originalWarn;
  }

  contents = await readFile(output, "utf8");
  assert.deepEqual(warnings, ["Changelog already contains version 2.0.0; replacing it."]);
  assert.equal(contents.match(/version: 2\.0\.0/g)?.length, 1);
});
