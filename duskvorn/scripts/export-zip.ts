/**
 * scripts/export-zip.ts
 *
 * Zips the entire DuskvorN monorepo (excluding node_modules, .next, dist,
 * and other build artifacts) into /dist/duskvorn.zip.
 *
 * Usage: npm run zip
 */
import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "dist");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "duskvorn.zip");

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", "dist-scripts", ".git", ".turbo", "coverage"]);
const EXCLUDED_FILES = new Set([".DS_Store"]);

function shouldSkip(entryName: string): boolean {
  const segments = entryName.split(path.sep);
  return segments.some((seg) => EXCLUDED_DIRS.has(seg)) || EXCLUDED_FILES.has(path.basename(entryName));
}

function addDirectory(archive: archiver.Archiver, dir: string, baseInZip: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, fullPath);

    if (shouldSkip(relativePath)) continue;

    const zipPath = path.join(baseInZip, entry.name);

    if (entry.isDirectory()) {
      addDirectory(archive, fullPath, zipPath);
    } else if (entry.isFile()) {
      archive.file(fullPath, { name: zipPath });
    }
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output = fs.createWriteStream(OUTPUT_FILE);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const done = new Promise<void>((resolve, reject) => {
    output.on("close", resolve);
    archive.on("error", reject);
    archive.on("warning", (warn) => console.warn("[export-zip] warning:", warn.message));
  });

  archive.pipe(output);
  addDirectory(archive, ROOT, "duskvorn");
  await archive.finalize();
  await done;

  const sizeMb = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`ZIP CREATED SUCCESSFULLY`);
  console.log(`  -> ${OUTPUT_FILE} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error("[export-zip] failed:", err);
  process.exit(1);
});
