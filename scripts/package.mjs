import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(repoRoot, "manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const stagingDirectory = join(repoRoot, "dist-store");
const archivePath = join(repoRoot, `PinAllWindows-${manifest.version}.zip`);

const packageEntries = [
  "manifest.json",
  "options.html",
  "side-panel.html",
  "LICENSE",
  "PRIVACY_POLICY.md",
  "icons",
  "src",
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function assertPathInside(parent, candidate) {
  const relativePath = relative(parent, candidate);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error(`Refusing to modify unsafe path: ${candidate}`);
  }
}

function copyPackageEntries() {
  assertPathInside(repoRoot, stagingDirectory);
  rmSync(stagingDirectory, { recursive: true, force: true });
  mkdirSync(stagingDirectory);

  for (const entry of packageEntries) {
    const source = join(repoRoot, entry);
    if (!existsSync(source)) {
      throw new Error(`Required package entry is missing: ${entry}`);
    }

    cpSync(source, join(stagingDirectory, entry), { recursive: true });
  }
}

function collectManifestPaths() {
  const paths = [
    manifest.background?.service_worker,
    manifest.options_page,
    manifest.side_panel?.default_path,
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ];

  return [...new Set(paths.filter(Boolean))];
}

function validateStagedPackage() {
  if (manifest.version !== packageJson.version) {
    throw new Error(
      `Version mismatch: manifest ${manifest.version}, package ${packageJson.version}`,
    );
  }

  for (const manifestPath of collectManifestPaths()) {
    if (!existsSync(join(stagingDirectory, manifestPath))) {
      throw new Error(`Manifest references a missing package file: ${manifestPath}`);
    }
  }
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(path);
    }

    return entry.isFile() && path.endsWith(".js") ? [path] : [];
  });
}

function createArchive() {
  assertPathInside(repoRoot, archivePath);
  rmSync(archivePath, { force: true });
  run("/usr/bin/zip", ["-qr", archivePath, "."], { cwd: stagingDirectory });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

console.log(`Packaging PinAllWindows ${manifest.version}`);
console.log("Running tests...");
run(process.execPath, ["--test"]);

console.log("Creating minimal staging directory...");
copyPackageEntries();
validateStagedPackage();

console.log("Checking packaged JavaScript syntax...");
for (const scriptPath of collectJavaScriptFiles(stagingDirectory)) {
  run(process.execPath, ["--check", scriptPath]);
}

console.log("Creating Chrome Web Store archive...");
createArchive();

const archiveContents = readFileSync(archivePath);
const checksum = createHash("sha256").update(archiveContents).digest("hex");
const archiveSize = statSync(archivePath).size;

console.log("");
console.log(`Package: ${archivePath}`);
console.log(`Size: ${formatBytes(archiveSize)}`);
console.log(`SHA-256: ${checksum}`);
console.log(`Staging directory: ${stagingDirectory}`);
