// Fetch public posts and categories from the Halo blog into src/data/blog.json.
// Runs before every build. The Halo API sends no CORS headers, so the browser
// cannot read it directly. On failure the previous blog.json is kept.
import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://halo.mosuyang.org";
const API = `${BASE}/apis/api.content.halo.run/v1alpha1`;
const OUT = new URL("../src/data/blog.json", import.meta.url);
const HIDDEN_CATEGORIES = new Set(["内部服务器命令"]);

async function getJson(path) {
  const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function fetchPosts() {
  const posts = [];
  for (let page = 1; ; page += 1) {
    const data = await getJson(`/posts?page=${page}&size=100&sort=spec.publishTime,desc`);
    posts.push(...data.items);
    if (!data.hasNext) return posts;
  }
}

try {
  const [rawPosts, rawCategories] = await Promise.all([fetchPosts(), getJson("/categories?size=200")]);

  const posts = rawPosts
    .map((post) => ({
      title: post.spec.title.trim(),
      url: `${BASE}${post.status.permalink}`,
      date: post.spec.publishTime.slice(0, 10),
      categories: (post.categories ?? []).map((category) => category.spec.displayName),
      excerpt: (post.status.excerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 140),
    }))
    .filter((post) => !post.categories.some((name) => HIDDEN_CATEGORIES.has(name)))
    .sort((a, b) => b.date.localeCompare(a.date));

  const categories = rawCategories.items
    .map((category) => ({
      name: category.spec.displayName,
      count: category.status?.visiblePostCount ?? 0,
      url: `${BASE}${category.status?.permalink ?? ""}`,
    }))
    .filter((category) => category.count > 0 && !HIDDEN_CATEGORIES.has(category.name))
    .sort((a, b) => b.count - a.count);

  // Rewrite only when the content changed, so builds don't dirty the tree with a new timestamp.
  const previous = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (previous && JSON.stringify([previous.posts, previous.categories]) === JSON.stringify([posts, categories])) {
    console.log(`blog.json: unchanged (${posts.length} posts)`);
  } else {
    const blog = { url: BASE, fetchedAt: new Date().toISOString(), posts, categories };
    await writeFile(OUT, `${JSON.stringify(blog, null, 2)}\n`);
    console.log(`blog.json: ${posts.length} posts, ${categories.length} categories`);
  }
} catch (error) {
  console.warn(`fetch-blog: ${error.message}; keeping the existing blog.json`);
}
