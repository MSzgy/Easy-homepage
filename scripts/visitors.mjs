// Unique-visitor counter, run by the 5-minute sync job.
// Reads new lines from the container's page-open log, counts each IP once
// (IPv6 by /64, since devices rotate the rest), skips bots, and stores only a
// keyed hash of each IP. Where a visitor is from comes from Cloudflare's
// location headers (country always; province/state only if "Add visitor
// location headers" is on), never from a lookup of the IP. The key and state
// never leave the server; only totals per place are published (in status.json).
import { createHmac, randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, stat, truncate, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BOT_UA = /bot|spider|crawl|slurp|curl|wget|python|httpx|go-http|java\/|okhttp|headless|lighthouse|pagespeed|monitor|uptime|preview|facebookexternalhit|easy-homepage-status/i;
const TIME_ZONE = "Asia/Shanghai"; // "today" follows the visitors' day, not UTC
const KEEP_DAYS = 30;
const TRUNCATE_AT = 2 * 1024 * 1024;
const TOP_COUNTRIES = 20;
const TOP_REGIONS = 12;

const dayOf = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });

function normalizeIp(raw) {
  const ip = raw.trim().toLowerCase();
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return ip;
  if (!/^[0-9a-f:]+$/.test(ip) || !ip.includes(":")) return null;
  const [head, tail = ""] = ip.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups = [...front, ...Array(Math.max(0, 8 - front.length - back.length)).fill("0"), ...back];
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

// nginx writes bytes outside printable ASCII as \xHH; turn them back into UTF-8.
function unescapeLog(raw = "-") {
  if (raw === "-") return "";
  const bytes = [];
  for (let i = 0; i < raw.length; i += 1) {
    const hex = raw[i] === "\\" && raw[i + 1] === "x" ? raw.slice(i + 2, i + 4) : "";
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 3;
    } else {
      bytes.push(raw.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

// [country, region code, region name], or null when Cloudflare didn't know.
// XX is Cloudflare's "unknown"; T1 is Tor and stays as its own entry.
function placeOf(country, regionCode, region) {
  const cc = unescapeLog(country).toUpperCase();
  if (!/^[A-Z][A-Z0-9]$/.test(cc) || cc === "XX") return null;
  const code = unescapeLog(regionCode).toUpperCase();
  const name = unescapeLog(region).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 48);
  return [cc, /^[A-Z0-9]{1,3}$/.test(code) ? code : "", name];
}

const top = (counts, limit) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);

async function readKey(dir) {
  const path = join(dir, "visitor-key");
  const existing = await readFile(path, "utf8").catch(() => "");
  if (existing.trim()) return existing.trim();
  const key = randomBytes(32).toString("hex");
  await writeFile(path, key, { mode: 0o600 });
  return key;
}

export async function countVisitors(dir) {
  const logDir = join(dir, "visits");
  const logPath = join(logDir, "visits.log");
  await mkdir(logDir, { recursive: true, mode: 0o755 });
  // Create the log ourselves so we own it and can truncate it later;
  // nginx in the container only appends to it.
  await (await open(logPath, "a", 0o644)).close();

  const key = await readKey(dir);
  const statePath = join(dir, "visitors-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8").catch(() => "{}"));
  const seen = state.seen ?? {};
  const places = state.places ?? {}; // hash -> [country, region code, region name]
  const days = Object.fromEntries(Object.entries(state.days ?? {}).map(([day, hashes]) => [day, new Set(hashes)]));
  let offset = state.offset ?? 0;

  const { size } = await stat(logPath);
  if (size < offset) offset = 0; // truncated or replaced since the last run
  if (size > offset) {
    const file = await open(logPath, "r");
    const { buffer } = await file.read(Buffer.alloc(size - offset), 0, size - offset, offset);
    await file.close();
    const text = buffer.toString("utf8");
    const complete = text.slice(0, text.lastIndexOf("\n") + 1); // ignore a half-written last line
    offset += Buffer.byteLength(complete);
    for (const line of complete.split("\n")) {
      // Lines from before location logging have only the first three fields.
      const [time, rawIp, agent = "", country, regionCode, region] = line.split("\t");
      if (!time || !rawIp || rawIp === "-" || BOT_UA.test(agent)) continue;
      const ip = normalizeIp(rawIp);
      if (!ip) continue;
      const day = dayOf(time);
      const hash = createHmac("sha256", key).update(ip).digest("hex").slice(0, 16);
      seen[hash] ??= day;
      (days[day] ??= new Set()).add(hash);
      const place = placeOf(country, regionCode, region);
      // First known place wins, but a region learned later fills in a gap.
      if (place && (!places[hash] || (!places[hash][2] && place[2] && place[0] === places[hash][0]))) places[hash] = place;
    }
  }

  // Truncate once everything is processed and the file has grown large.
  if (offset > TRUNCATE_AT) {
    try {
      if ((await stat(logPath)).size === offset) {
        await truncate(logPath, 0);
        offset = 0;
      }
    } catch (error) {
      console.warn(`visitors: could not truncate the log (${error.code})`);
    }
  }

  const today = dayOf(new Date().toISOString());
  const recent = Object.keys(days).sort().slice(-KEEP_DAYS);
  const kept = Object.fromEntries(recent.map((day) => [day, days[day]]));
  const lastWeek = recent.filter((day) => (Date.parse(today) - Date.parse(day)) / 864e5 < 7);
  const week = new Set(lastWeek.flatMap((day) => [...kept[day]])).size;

  const next = { offset, seen, places, days: Object.fromEntries(recent.map((day) => [day, [...kept[day]]])) };
  await writeFile(`${statePath}.tmp`, JSON.stringify(next), { mode: 0o600 });
  await rename(`${statePath}.tmp`, statePath);

  // Visitors per country and per first-level region, each visitor once.
  const countries = new Map();
  const regions = new Map();
  for (const [cc, code, name] of Object.values(places)) {
    countries.set(cc, (countries.get(cc) ?? 0) + 1);
    if (name) {
      const id = `${cc}\t${code}\t${name}`;
      regions.set(id, (regions.get(id) ?? 0) + 1);
    }
  }

  const firstDays = Object.values(seen).sort();
  return {
    total: firstDays.length,
    today: kept[today]?.size ?? 0,
    week,
    since: firstDays[0] ?? null,
    located: Object.keys(places).length,
    countryCount: countries.size,
    countries: top(countries, TOP_COUNTRIES),
    regions: top(regions, TOP_REGIONS).map(([id, n]) => [...id.split("\t"), n]),
  };
}
