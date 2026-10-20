// Runtime data: starts from what was bundled at build time, then loadLive()
// swaps in /data/live.json written by the server-side sync. main.jsx awaits
// loadLive() before importing the app, so every module sees the fresh values.
import bundledBlog from "./blog.json";

export let blog = bundledBlog;
export let githubRepos = [];
export let commits = [];

export async function loadLive(timeoutMs = 1500) {
  try {
    const response = await fetch("/data/live.json", { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return;
    const live = await response.json();
    if (live.blog?.posts?.length) blog = live.blog;
    if (Array.isArray(live.github?.repos)) githubRepos = live.github.repos;
    if (Array.isArray(live.github?.commits)) commits = live.github.commits;
  } catch {
    // Keep the bundled data: dev server, first deploy, or a slow network.
  }
}
