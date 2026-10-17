// Server-side sync: writes live.json, which the homepage reads at runtime.
// Run by the easy-homepage-sync systemd timer; usage: node sync-live.mjs <output path>
// Each source is independent: if one fails, its last good data is kept.
import { readFile, rename, writeFile } from "node:fs/promises";
import { fetchBlog, fetchGitHub } from "./sources.mjs";

const out = process.argv[2] ?? "live.json";
const previous = await readFile(out, "utf8").then(JSON.parse).catch(() => ({}));
const [blog, github] = await Promise.allSettled([fetchBlog(), fetchGitHub()]);

const next = {
  generatedAt: new Date().toISOString(),
  blog: blog.status === "fulfilled" ? { ...blog.value, fetchedAt: new Date().toISOString() } : previous.blog ?? null,
  github: github.status === "fulfilled" ? { ...github.value, fetchedAt: new Date().toISOString() } : previous.github ?? null,
};

// Write then rename, so nginx never serves a half-written file.
await writeFile(`${out}.tmp`, JSON.stringify(next));
await rename(`${out}.tmp`, out);

for (const [name, result] of [["blog", blog], ["github", github]]) {
  console.log(result.status === "fulfilled" ? `${name}: ok` : `${name}: failed (${result.reason.message}), kept previous`);
}
