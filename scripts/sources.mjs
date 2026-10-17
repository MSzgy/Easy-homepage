// Public data sources shared by the build-time fetch and the server-side sync.
export const BLOG_BASE = "https://halo.mosuyang.org";
export const GITHUB_USER = "MSzgy";

const HALO_API = `${BLOG_BASE}/apis/api.content.halo.run/v1alpha1`;
const HIDDEN_CATEGORIES = new Set(["内部服务器命令"]);

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function fetchBlog() {
  const rawPosts = [];
  for (let page = 1; ; page += 1) {
    const data = await getJson(`${HALO_API}/posts?page=${page}&size=100&sort=spec.publishTime,desc`);
    rawPosts.push(...data.items);
    if (!data.hasNext) break;
  }
  const rawCategories = await getJson(`${HALO_API}/categories?size=200`);

  const posts = rawPosts
    .map((post) => ({
      title: post.spec.title.trim(),
      url: `${BLOG_BASE}${post.status.permalink}`,
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
      url: `${BLOG_BASE}${category.status?.permalink ?? ""}`,
    }))
    .filter((category) => category.count > 0 && !HIDDEN_CATEGORIES.has(category.name))
    .sort((a, b) => b.count - a.count);

  return { url: BLOG_BASE, posts, categories };
}

// Unauthenticated: only public repositories, one request per run (limit is 60/hour).
export async function fetchGitHub() {
  const repos = await getJson(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, {
    Accept: "application/vnd.github+json",
    "User-Agent": "easy-homepage-sync",
  });
  return {
    repos: repos
      .filter((repo) => !repo.fork && !repo.private)
      .map((repo) => ({
        name: repo.name,
        description: repo.description ?? "",
        language: repo.language ?? "",
        stars: repo.stargazers_count,
        created: repo.created_at.slice(0, 10),
        pushed: repo.pushed_at.slice(0, 10),
        url: repo.html_url,
      })),
  };
}
