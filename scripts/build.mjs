import { rmSync, mkdirSync, cpSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

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

  const rendered = html.replace(includePattern, (_match, includePath) => {
    const partialPath = path.resolve(path.dirname(resolvedEntry), includePath);

    if (!existsSync(partialPath)) {
      throw new Error(`Partial not found: ${includePath} in ${entryFilePath}`);
    }

    return renderHtmlWithPartials(partialPath, new Set(seen));
  });

  return rendered;
}

function clean() {
  if (existsSync(DOCS)) rmSync(DOCS, { recursive: true, force: true });
  mkdirSync(`${DOCS}/css`, { recursive: true });
  mkdirSync(`${DOCS}/js`, { recursive: true });
  mkdirSync(`${DOCS}/assets`, { recursive: true });
}

function copyStatic() {
  // kopieer alle .html bestanden in src root
  for (const file of readdirSync(SRC)) {
    if (file.endsWith(".html")) {
      const fromPath = path.join(SRC, file);
      const toPath = path.join(DOCS, file);
      const renderedHtml = renderHtmlWithPartials(fromPath);

      writeFileSync(toPath, renderedHtml, "utf8");
    }
  }

  cpSync(`${SRC}/js`, `${DOCS}/js`, { recursive: true, force: true });
  cpSync(`${SRC}/assets`, `${DOCS}/assets`, { recursive: true, force: true });

  // kopieer root-bestanden die direct in docs moeten staan
  for (const file of ["sitemap.xml", "robots.txt", "site.webmanifest"]) {
    if (existsSync(`${SRC}/${file}`)) {
      copyFileSync(`${SRC}/${file}`, `${DOCS}/${file}`);
    }
  }
}

function buildCss() {
  execSync(
    "npx tailwindcss -i ./src/css/main.css -o ./docs/css/main.css --postcss --minify",
    { stdio: "inherit" }
  );
}

clean();
copyStatic();
buildCss();
