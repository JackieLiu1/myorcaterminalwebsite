import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const downloadsDir = path.join(rootDir, "downloads");
const assetsDir = path.join(rootDir, "assets");
const manifestPath = path.join(downloadsDir, "manifest.json");
const embeddedManifestPath = path.join(assetsDir, "downloads-manifest.js");

const platformOrder = new Map([
  ["macos", 0],
  ["windows", 1],
  ["linux", 2],
]);

const archOrder = new Map([
  ["x64", 0],
  ["arm64", 1],
]);

const formatOrder = new Map([
  ["dmg", 0],
  ["exe", 0],
  ["deb", 0],
  ["rpm", 1],
  ["appimage", 2],
  ["pkg", 3],
  ["msi", 3],
  ["zip", 4],
  ["tar.gz", 5],
  ["tgz", 5],
]);

const normalize = (value) => value.toLowerCase().replace(/[\s_]+/g, "-");

const isInstaller = (fileName) =>
  /\.(dmg|pkg|zip|exe|msi|appimage|deb|rpm|tar\.gz|tgz)$/i.test(fileName);

const normalizePackageFormat = (fileName) => {
  const normalized = normalize(fileName);
  if (normalized.endsWith(".tar.gz")) return "tar.gz";

  const match = normalized.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
};

const normalizePlatform = (fileName) => {
  const normalized = normalize(fileName);

  if (normalized.includes("macos") || normalized.includes("darwin") || normalized.includes("osx")) {
    return "macos";
  }

  if (normalized.includes("windows") || normalized.includes("win")) {
    return "windows";
  }

  if (
    normalized.includes("linux") ||
    normalized.endsWith(".appimage") ||
    normalized.endsWith(".deb") ||
    normalized.endsWith(".rpm")
  ) {
    return "linux";
  }

  return "";
};

const normalizeArch = (fileName) => {
  const normalized = normalize(fileName);

  if (
    normalized.includes("arm64") ||
    normalized.includes("aarch64") ||
    normalized.includes("apple-silicon")
  ) {
    return "arm64";
  }

  if (
    normalized.includes("x64") ||
    normalized.includes("x86-64") ||
    normalized.includes("amd64") ||
    normalized.includes("intel")
  ) {
    return "x64";
  }

  return "";
};

const stripInstallerExtension = (fileName) =>
  fileName.replace(/\.(tar\.gz|tgz|dmg|pkg|zip|exe|msi|appimage|deb|rpm)$/i, "");

const extractVersion = (fileName) => {
  const baseName = stripInstallerExtension(fileName);
  const match = baseName.match(/v?\d+\.\d+\.\d+/i);
  if (!match) return "";

  let version = match[0].replace(/^v/i, "");
  const suffix = baseName.slice(match.index + match[0].length);
  const prerelease = suffix.match(/^[-_](alpha|beta|rc|preview|dev|canary|nightly)(?:[.-][0-9A-Za-z]+)*/i);

  if (prerelease) {
    version += `-${prerelease[0].slice(1)}`;
  }

  return `v${version}`;
};

const formatSize = (bytes) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
};

const hashFile = (filePath, algorithm) =>
  new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

await mkdir(downloadsDir, { recursive: true });
await mkdir(assetsDir, { recursive: true });

const entries = await readdir(downloadsDir, { withFileTypes: true });
const files = [];

for (const entry of entries) {
  if (!entry.isFile() || entry.name === "manifest.json" || entry.name.startsWith(".")) continue;
  if (!isInstaller(entry.name)) continue;

  const platform = normalizePlatform(entry.name);
  const arch = normalizeArch(entry.name);
  const format = normalizePackageFormat(entry.name);
  if (!platform || !arch) continue;
  if (platform === "windows" && arch !== "x64") continue;

  const filePath = path.join(downloadsDir, entry.name);
  const fileStat = await stat(filePath);
  const md5 = await hashFile(filePath, "md5");

  files.push({
    os: platform,
    arch,
    format,
    file: entry.name,
    version: extractVersion(entry.name),
    size: formatSize(fileStat.size),
    md5,
    updatedAt: fileStat.mtime.toISOString(),
  });
}

files.sort((left, right) => {
  const platformDelta = platformOrder.get(left.os) - platformOrder.get(right.os);
  if (platformDelta) return platformDelta;

  const archDelta = archOrder.get(left.arch) - archOrder.get(right.arch);
  if (archDelta) return archDelta;

  const formatDelta = (formatOrder.get(left.format) ?? 99) - (formatOrder.get(right.format) ?? 99);
  if (formatDelta) return formatDelta;

  return right.updatedAt.localeCompare(left.updatedAt);
});

const latest = files.reduce((current, file) => {
  if (!current) return file;
  return file.updatedAt > current.updatedAt ? file : current;
}, null);

const manifest = {
  release: {
    version: latest?.version || "",
    channel: "Stable",
    updatedAt: latest?.updatedAt || "",
  },
  files,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  embeddedManifestPath,
  `window.__ORCATERMINAL_DOWNLOAD_MANIFEST__ = ${JSON.stringify(manifest, null, 2)};\n`,
);

console.log(`Generated ${path.relative(rootDir, manifestPath)} with ${files.length} file(s).`);
console.log(`Generated ${path.relative(rootDir, embeddedManifestPath)} with ${files.length} file(s).`);
