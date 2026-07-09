import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const distDir = join(rootDir, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || "4173");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function buildSite() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(rootDir, "scripts", "build.mjs")], {
      cwd: rootDir,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code ?? "unknown"}.`));
    });
    child.on("error", reject);
  });
}

function resolvePath(urlPath) {
  const pathname = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return join(distDir, normalized);
}

async function start() {
  await buildSite();

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
    const targetPath = resolvePath(requestUrl.pathname);

    try {
      const data = await readFile(targetPath);
      const contentType = mimeTypes[extname(targetPath)] || "application/octet-stream";

      response.writeHead(200, { "Content-Type": contentType });
      response.end(data);
    } catch {
      try {
        const fallback = await readFile(join(distDir, "index.html"));
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(fallback);
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
      }
    }
  });

  server.listen(port, host, () => {
    console.log(`Preview server running at http://${host}:${port}`);
  });
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
