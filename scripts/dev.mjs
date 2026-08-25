import chokidar from "chokidar";
import { mkdirSync, cpSync, copyFileSync, existsSync, rmSync, readFileSync, writeFileSync } from "node:fs";
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

function copyDir(from, to) {
  ensureDirs();
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, force: true });
}

function removePath(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

function renderRootHtmlFile(fileName) {
  const source = path.join(SRC, fileName);
  const dest = path.join(DOCS, fileName);
  const html = renderHtmlWithPartials(source);

  ensureDirs();
  writeFileWithRetry(dest, html, "utf8");
}

function renderAllRootHtmlFiles() {
  for (const file of readdirSync(SRC)) {
    if (file.endsWith(".html")) {
      renderRootHtmlFile(file);
    }
  }
}

function isPartialsHtmlFile(p) {
  return p.startsWith(path.join(SRC, "partials") + path.sep) && path.extname(p) === ".html";
}

function initialSync() {
  ensureDirs();
  renderAllRootHtmlFiles();

  for (const file of ["robots.txt", "sitemap.xml", "site.webmanifest"]) {
    const from = path.join(SRC, file);
    if (existsSync(from)) {
      copyFile(from, path.join(DOCS, file));
    }
  }

  copyDir(path.join(SRC, "js"), path.join(DOCS, "js"));
  copyDir(path.join(SRC, "assets"), path.join(DOCS, "assets"));
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

const watcher = chokidar.watch(
  [
    SRC,
    `${SRC}/js/**`,
    `${SRC}/assets/**`,
  ],
  { ignoreInitial: true }
);

function isRootHtml(p) {
  // alleen src/*.html (geen subfolders)
  return p.startsWith(`${SRC}${path.sep}`) &&
    path.extname(p) === ".html" &&
    path.dirname(p) === SRC;
}

watcher
  .on("add", (p) => {
    if (isPartialsHtmlFile(p)) {
      renderAllRootHtmlFiles();
      return;
    }

    const dest = toDocsPath(p);
    copyFile(p, dest);
  })
  .on("change", (p) => {
    if (isPartialsHtmlFile(p)) {
      renderAllRootHtmlFiles();
      return;
    }

    if (isRootHtml(p) ||
      p.includes(`${path.sep}js${path.sep}`) ||
      p.includes(`${path.sep}assets${path.sep}`)) {
      if (isRootHtml(p)) {
        renderRootHtmlFile(path.basename(p));
      } else {
        const dest = toDocsPath(p);
        copyFile(p, dest);
      }
    }
  })
  .on("unlink", (p) => {
    if (isPartialsHtmlFile(p)) {
      renderAllRootHtmlFiles();
      return;
    }

    const dest = toDocsPath(p);
    removePath(dest);
  })
  .on("addDir", (p) => {
    const dest = toDocsPath(p);
    mkdirSync(dest, { recursive: true });
  })
  .on("unlinkDir", (p) => {
    const dest = toDocsPath(p);
    removePath(dest);
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
