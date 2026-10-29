import chokidar from "chokidar";
import { mkdirSync, copyFileSync, existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";

function writeFileWithRetry(filePath, content, encoding = "utf8") {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      writeFileSync(filePath, content, encoding);
      return;
    } catch (error) {
      if (attempt === maxAttempts || error.code !== "EBUSY") {
        throw error;
      }

      const waitMs = attempt * 150;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
    }
  }
}

const SRC = "src";
const DOCS = "docs";

function renderHtmlWithPartials(entryFilePath, seen = new Set()) {
  const resolvedEntry = path.resolve(entryFilePath);

  if (seen.has(resolvedEntry)) {
    throw new Error(`Circular partial include detected: ${resolvedEntry}`);
  }

  seen.add(resolvedEntry);

  const html = readFileSync(resolvedEntry, "utf8");
  const includePattern = /<!--\s*@include\s+([^\s]+)\s*-->/g;

  return html.replace(includePattern, (_match, includePath) => {
    const partialPath = path.resolve(path.dirname(resolvedEntry), includePath);

    if (!existsSync(partialPath)) {
      throw new Error(`Partial not found: ${includePath} in ${entryFilePath}`);
    }

    return renderHtmlWithPartials(partialPath, new Set(seen));
  });
}

function ensureDirs() {
  mkdirSync(path.join(DOCS, "css"), { recursive: true });
  mkdirSync(path.join(DOCS, "js"), { recursive: true });
  mkdirSync(path.join(DOCS, "assets"), { recursive: true });
}

function copyFile(from, to) {
  ensureDirs();
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(from, to);
}

function removePath(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

function renderHtmlFile(source) {
  const dest = toDocsPath(source);
  const html = renderHtmlWithPartials(source);

  ensureDirs();
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileWithRetry(dest, html, "utf8");
}

// css wordt door Tailwind gebouwd, partials worden in de html opgenomen
function isExcludedPath(p) {
  return [path.join(SRC, "css"), path.join(SRC, "partials")].some(
    (dir) => p === dir || p.startsWith(dir + path.sep)
  );
}

function listSrcFiles(dir = SRC) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (isExcludedPath(p)) continue;

    if (entry.isDirectory()) {
      files.push(...listSrcFiles(p));
    } else {
      files.push(p);
    }
  }

  return files;
}

function renderAllHtmlFiles() {
  for (const file of listSrcFiles()) {
    if (path.extname(file) === ".html") {
      renderHtmlFile(file);
    }
  }
}

function isPartialsHtmlFile(p) {
  return p.startsWith(path.join(SRC, "partials") + path.sep) && path.extname(p) === ".html";
}

function syncFile(p) {
  if (isPartialsHtmlFile(p)) {
    renderAllHtmlFiles();
    return;
  }

  if (isExcludedPath(p)) return;

  if (path.extname(p) === ".html") {
    renderHtmlFile(p);
  } else {
    copyFile(p, toDocsPath(p));
  }
}

function initialSync() {
  ensureDirs();

  for (const file of listSrcFiles()) {
    syncFile(file);
  }
}

function toDocsPath(srcPath) {
  // src/xyz -> docs/xyz
  return path.join(DOCS, path.relative(SRC, srcPath));
}

ensureDirs();
initialSync();

// Tailwind watcher (dev: geen minify)
const tw = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "exec",
    "--",
    "tailwindcss",
    "-i",
    "./src/css/main.css",
    "-o",
    "./docs/css/main.css",
    "--postcss",
    "--watch",
  ],
  {
    stdio: "inherit",
    shell: process.platform === "win32", // belangrijk voor Windows + spaties in paden
    env: {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=2048",
    },
  }
);

const watcher = chokidar.watch(SRC, { ignoreInitial: true });

watcher
  .on("add", syncFile)
  .on("change", syncFile)
  .on("unlink", (p) => {
    if (isPartialsHtmlFile(p)) {
      renderAllHtmlFiles();
      return;
    }

    if (isExcludedPath(p)) return;

    removePath(toDocsPath(p));
  })
  .on("addDir", (p) => {
    if (isExcludedPath(p)) return;

    mkdirSync(toDocsPath(p), { recursive: true });
  })
  .on("unlinkDir", (p) => {
    if (isExcludedPath(p)) return;

    removePath(toDocsPath(p));
  });

// Netjes afsluiten
function shutdown(code = 0) {
  try {
    watcher.close();
  } catch { }
  try {
    tw.kill("SIGINT");
  } catch { }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
