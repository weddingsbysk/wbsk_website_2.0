// Serves the static export the way GitHub Pages does, including the base path, for tests.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("apps/web/out");
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/wbsk_website_2.0";
const port = 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".mp4": "video/mp4",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (!url.startsWith(base)) {
      res.writeHead(404).end("outside base path");
      return;
    }
    const rel = url.slice(base.length) || "/";
    let file = path.join(root, rel);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.endsWith("/")) {
        res.writeHead(301, { location: `${url}/` }).end();
        return;
      }
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file)) {
      res
        .writeHead(404, { "content-type": types[".html"] })
        .end(fs.readFileSync(path.join(root, "404.html")));
      return;
    }
    res
      .writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" })
      .end(fs.readFileSync(file));
  })
  .listen(port, "127.0.0.1", () => console.log(`Serving on http://127.0.0.1:${port}${base}/`));
