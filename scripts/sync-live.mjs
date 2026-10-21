// Server-side sync, run every 5 minutes by easy-homepage-sync.timer.
// usage: node sync-live.mjs <data dir>
//   status.json  every run: are the public apps up, how fast (last 6 hours),
//                and unique-visitor totals (see visitors.mjs)
//   live.json    hourly: blog posts, public repos, recent commits
// Each source is independent: if one fails, its last good data is kept.
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkStatus, fetchBlog, fetchGitHub } from "./sources.mjs";
import { countVisitors } from "./visitors.mjs";

const dir = process.argv[2] ?? ".";
const CONTENT_EVERY_MS = 55 * 60 * 1000;
const HISTORY = 72; // 72 checks x 5 minutes = 6 hours

const readJson = (name) => readFile(join(dir, name), "utf8").then(JSON.parse).catch(() => ({}));
// Write then rename, so nginx never serves a half-written file.
const writeJson = async (name, data) => {
  await writeFile(join(dir, `${name}.tmp`), JSON.stringify(data));
  await rename(join(dir, `${name}.tmp`), join(dir, name));
};

const now = new Date().toISOString();

const previousStatus = await readJson("status.json");
const checks = await checkStatus();
const services = Object.fromEntries(
  checks.map(({ id, ok, code, ms }) => {
    const history = [...(previousStatus.services?.[id]?.history ?? []), { t: now, ok, ms }].slice(-HISTORY);
    return [id, { ok, code, ms, history }];
  }),
);
// A counting failure must not stop the status checks; keep the last totals.
const visitors = await countVisitors(dir).catch((error) => {
  console.warn(`visitors: ${error.message}`);
  return previousStatus.visitors ?? null;
});
await writeJson("status.json", { checkedAt: now, services, visitors });
console.log(`status: ${checks.filter((c) => c.ok).length}/${checks.length} up; visitors: ${visitors?.total ?? "?"} unique`);

const previous = await readJson("live.json");
const stale = !previous.generatedAt || Date.now() - Date.parse(previous.generatedAt) > CONTENT_EVERY_MS;
if (stale || process.argv.includes("--full")) {
  const [blog, github] = await Promise.allSettled([fetchBlog(), fetchGitHub()]);
  await writeJson("live.json", {
    generatedAt: now,
    blog: blog.status === "fulfilled" ? { ...blog.value, fetchedAt: now } : previous.blog ?? null,
    github: github.status === "fulfilled" ? { ...github.value, fetchedAt: now } : previous.github ?? null,
  });
  for (const [name, result] of [["blog", blog], ["github", github]]) {
    console.log(result.status === "fulfilled" ? `${name}: ok` : `${name}: failed (${result.reason.message}), kept previous`);
  }
}
