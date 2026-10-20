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

// Unauthenticated: only public repositories. 1 request for the list plus one
// per recent repo for commits (the events API no longer carries messages);
// about 5 requests per run, well under the 60/hour limit.
const GITHUB_HEADERS = { Accept: "application/vnd.github+json", "User-Agent": "easy-homepage-sync" };
const COMMIT_REPOS = 4;

export async function fetchGitHub() {
  const raw = await getJson(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`, GITHUB_HEADERS);
  const repos = raw
    .filter((repo) => !repo.fork && !repo.private)
    .map((repo) => ({
      name: repo.name,
      description: repo.description ?? "",
      language: repo.language ?? "",
      stars: repo.stargazers_count,
      created: repo.created_at.slice(0, 10),
      pushed: repo.pushed_at.slice(0, 10),
      url: repo.html_url,
    }));

  const recent = [...repos].sort((a, b) => b.pushed.localeCompare(a.pushed)).slice(0, COMMIT_REPOS);
  const lists = await Promise.allSettled(
    recent.map((repo) => getJson(`https://api.github.com/repos/${GITHUB_USER}/${repo.name}/commits?per_page=5`, GITHUB_HEADERS)),
  );
  const commits = lists
    .flatMap((result, i) => (result.status === "fulfilled" ? result.value.map((c) => ({ repo: recent[i].name, c })) : []))
    .map(({ repo, c }) => ({
      repo,
      sha: c.sha.slice(0, 7),
      message: (c.commit.message.split("\n")[0] ?? "").slice(0, 100),
      date: c.commit.author?.date ?? c.commit.committer?.date ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return { repos, commits };
}

// Public apps the homepage links to. Keep in sync with linkOf() in src/data/graph.js;
// only public URLs, so the check never reveals internal services.
export const STATUS_TARGETS = [
  { id: "eh", url: "https://mosuyang.org/" },
  { id: "nw", url: "https://novel-dev.mosuyang.org/" },
  { id: "vf", url: "https://capcut.mosuyang.org/" },
  { id: "hd", url: "https://hometwin.mosuyang.org/" },
  { id: "rr", url: "https://regret-reverse.mosuyang.org/" },
  { id: "sv", url: "https://solana-voting.mosuyang.org/" },
];

// Up = any response below 500 within the timeout (a login redirect still counts).
export async function checkStatus() {
  return Promise.all(
    STATUS_TARGETS.map(async ({ id, url }) => {
      const started = performance.now();
      try {
        const response = await fetch(url, {
          redirect: "manual",
          headers: { "User-Agent": "easy-homepage-status" },
          signal: AbortSignal.timeout(8000),
        });
        const ms = Math.round(performance.now() - started);
        await response.body?.cancel();
        return { id, ok: response.status < 500, code: response.status, ms };
      } catch {
        return { id, ok: false, code: 0, ms: null };
      }
    }),
  );
}
