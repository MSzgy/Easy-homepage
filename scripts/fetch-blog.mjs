// Fetch public posts and categories from the Halo blog into src/data/blog.json.
// Runs before every build as the bundled fallback; the server-side sync
// (sync-live.mjs) keeps the live site fresh between deploys.
import { readFile, writeFile } from "node:fs/promises";
import { fetchBlog } from "./sources.mjs";

const OUT = new URL("../src/data/blog.json", import.meta.url);

try {
  const { url, posts, categories } = await fetchBlog();
  // Rewrite only when the content changed, so builds don't dirty the tree with a new timestamp.
  const previous = await readFile(OUT, "utf8").then(JSON.parse).catch(() => null);
  if (previous && JSON.stringify([previous.posts, previous.categories]) === JSON.stringify([posts, categories])) {
    console.log(`blog.json: unchanged (${posts.length} posts)`);
  } else {
    await writeFile(OUT, `${JSON.stringify({ url, fetchedAt: new Date().toISOString(), posts, categories }, null, 2)}\n`);
    console.log(`blog.json: ${posts.length} posts, ${categories.length} categories`);
  }
} catch (error) {
  console.warn(`fetch-blog: ${error.message}; keeping the existing blog.json`);
}
