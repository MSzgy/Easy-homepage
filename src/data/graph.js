// Projects, infrastructure, and blog topics, plus the real links between them.
// Add a project here and it shows up in both modes, the timeline, and the terminal.
import { blog, githubRepos } from "./store.js";

export const CLUSTERS = [
  { id: "create", zh: "AI 内容创作", en: "AI content creation" },
  { id: "agent", zh: "Agent 工具", en: "Agent tooling" },
  { id: "web3", zh: "Web3 实验", en: "Web3 experiments" },
  { id: "life", zh: "生活里的 AI", en: "AI in daily life" },
  { id: "infra", zh: "基础设施", en: "Infrastructure" },
  { id: "blog", zh: "博客笔记", en: "Blog notes" },
];

const gh = (name) => `https://github.com/MSzgy/${name}`;

// repo: null for private repositories (shown, but without a code link).
// linkPublic: false keeps a running service out of the page's links (admin UIs, APIs).
// desc is for technical readers; plain is one sentence for everyone else.
const BASE_PROJECTS = [
  {
    id: "nw",
    nick: { zh: "写小说的书桌", en: "A desk for novels" },
    name: "Easy-Novel-writer",
    cluster: "create",
    created: "2026-02-23",
    pushed: "2026-09-11",
    live: "https://novel-dev.mosuyang.org",
    repo: null,
    stack: ["Next.js", "FastAPI", "SQLAlchemy"],
    desc: {
      zh: "AI 小说创作台：续写润色、划词生成插图、按题材推荐配乐。",
      en: "AI novel studio: drafting and polishing, inline illustrations, mood music.",
    },
    plain: {
      zh: "一个陪你写小说的书桌：AI 帮你往下写，还会给段落配上插图和音乐。",
      en: "A writing desk for novels: AI helps the story along and adds pictures and music.",
    },
  },
  {
    id: "vs",
    nick: { zh: "故事变视频", en: "Stories into film" },
    name: "AI-Video-skill",
    cluster: "create",
    created: "2026-08-09",
    pushed: "2026-08-15",
    live: null,
    repo: gh("AI-Video-skill"),
    stack: ["Claude Skill", "ComfyUI", "MiniMax"],
    desc: {
      zh: "把小说、剧本或分镜表变成角色一致的连续 AI 视频，长任务可断点续跑。",
      en: "Turns a novel or script into character-consistent AI video shots, with resumable runs.",
    },
    plain: {
      zh: "把一段故事拍成一组连贯的短视频镜头，主角从头到尾长得一样。",
      en: "Films a story as a run of short video shots, with the same hero in every one.",
    },
  },
  {
    id: "vf",
    nick: { zh: "短视频工作室", en: "Short-video studio" },
    name: "Easy-Video-Fun",
    cluster: "create",
    created: "2026-01-25",
    pushed: "2026-06-20",
    live: "https://capcut.mosuyang.org",
    repo: null,
    stack: ["Next.js", "FastAPI", "iOS"],
    desc: {
      zh: "AI 视频工作台：文案、分镜、配音、素材生成，导出剪映草稿，另有 iOS App ClipForge。",
      en: "AI video workbench: scripts, shots, voice, assets, CapCut drafts, and the ClipForge iOS app.",
    },
    plain: {
      zh: "从写文案、配音到剪辑，一站做出一条短视频，手机上也能用。",
      en: "From script to voice to edit, make a short video in one place, even on your phone.",
    },
  },
  {
    id: "mm",
    nick: { zh: "AI 的画笔", en: "A brush for AI" },
    name: "Media-MCP-Server",
    cluster: "agent",
    created: "2026-03-20",
    pushed: "2026-05-22",
    live: "https://mediamcp.mosuyang.org",
    linkPublic: false,
    repo: gh("Media-MCP-Server"),
    stack: ["TypeScript", "MCP", "Gemini / Veo"],
    desc: {
      zh: "把图片、视频、音频生成接口统一包装成 MCP 工具，任何 Agent 都能直接调用。",
      en: "Wraps image, video, and audio generation APIs as MCP tools any agent can call.",
    },
    plain: {
      zh: "给各种 AI 助手装上“会画画、会拍视频、会说话”的本领。",
      en: "Teaches AI assistants to draw, film, and speak.",
    },
  },
  {
    id: "ot",
    nick: { zh: "写日报的水獭", en: "The diary otter" },
    name: "otter",
    cluster: "agent",
    created: "2026-08-26",
    pushed: "2026-10-09",
    live: null,
    repo: gh("otter"),
    stack: ["Python", "LangGraph", "Claude"],
    desc: {
      zh: "私人 Mac 工作助理：每天收集 Git 和 GitHub 上的工作痕迹，生成一份中文日报。",
      en: "Personal Mac work assistant that turns daily Git and GitHub traces into a summary.",
    },
    plain: {
      zh: "一只小水獭，每天帮我整理做过的事，写好一份日报。",
      en: "A little otter that tidies up my day and writes my daily report.",
    },
  },
  {
    id: "gs",
    nick: { zh: "一句话造应用", en: "One-line app maker" },
    name: "generating-solana-projects",
    cluster: "web3",
    created: "2026-01-23",
    pushed: "2026-01-23",
    live: null,
    repo: gh("generating-solana-projects"),
    stack: ["Claude Skill", "Anchor", "Next.js"],
    desc: {
      zh: "Claude Code 技能：一句话生成完整的 Solana dApp 项目骨架。",
      en: "Claude Code skill that scaffolds a complete Solana dApp from one prompt.",
    },
    plain: {
      zh: "说一句话，就搭好一个区块链应用的雏形。",
      en: "Say one sentence and get the first draft of a blockchain app.",
    },
  },
  {
    id: "sv",
    nick: { zh: "链上投票箱", en: "Ballot box on chain" },
    name: "solana-voting-system",
    cluster: "web3",
    created: "2026-01-23",
    pushed: "2026-01-23",
    live: "https://solana-voting.mosuyang.org",
    repo: gh("solana-voting-system"),
    stack: ["Rust", "Anchor", "Next.js"],
    desc: {
      zh: "链上投票 dApp：创建投票、用钱包签名投票、实时查看结果。",
      en: "On-chain voting dApp: create polls, vote with a wallet, watch live results.",
    },
    plain: {
      zh: "一个放在区块链上的投票箱，投完的票谁也改不了。",
      en: "A ballot box on the blockchain; once cast, nobody can change a vote.",
    },
  },
  {
    id: "pm",
    nick: { zh: "预测市场演习", en: "Prediction-market drill" },
    name: "PolyMarketTrade",
    cluster: "web3",
    created: "2026-04-09",
    pushed: "2026-04-09",
    live: null,
    repo: gh("PolyMarketTrade"),
    stack: ["TypeScript", "Polymarket CLOB"],
    desc: {
      zh: "预测市场自动交易框架，分层风控，默认只模拟、不真实下单。",
      en: "Prediction-market trading framework with layered risk checks; dry-run by default.",
    },
    plain: {
      zh: "让程序在预测市场里练习下注，默认只是演习。",
      en: "Lets a program practice betting on prediction markets; it's only a drill by default.",
    },
  },
  {
    id: "hd",
    nick: { zh: "家的数字分身", en: "A digital twin of home" },
    name: "home-digital-twin",
    cluster: "life",
    created: "2026-09-27",
    pushed: "2026-10-14",
    live: "https://hometwin.mosuyang.org",
    repo: null,
    stack: ["TypeScript", "LLM Copilot", "Home Assistant"],
    desc: {
      zh: "住宅数字孪生：把户型、电路、网络和智能家居建成结构化数据，再配一个 AI 设计助手。",
      en: "Residential digital twin: floor plans, circuits, networking, and smart home as data, with an AI copilot.",
    },
    plain: {
      zh: "装修之前，先在电脑里把家“造”一遍：户型、电线、智能家居都提前想好。",
      en: "Build your home on the computer before renovating: rooms, wiring, and smart devices.",
    },
  },
  {
    id: "rr",
    nick: { zh: "如果当时", en: "What if" },
    name: "regret-reverse",
    cluster: "life",
    created: "2026-05-10",
    pushed: "2026-06-20",
    live: "https://regret-reverse.mosuyang.org",
    repo: null,
    stack: ["Go", "Next.js", "小程序"],
    desc: {
      zh: "如果当时：输入一个后悔，看清三条人生线，拿到一个小小的反选行动。",
      en: "What if: enter a regret, see three life lines, and get one small action to take.",
    },
    plain: {
      zh: "写下一件后悔的事，看看另外三种人生，再给自己一个小小的行动。",
      en: "Write down a regret, glimpse three other lives, and take one small step.",
    },
  },
  {
    id: "eh",
    nick: { zh: "这张地图", en: "This map" },
    name: "Easy-homepage",
    cluster: "life",
    created: "2026-06-28",
    pushed: "2026-10-17",
    live: "https://mosuyang.org",
    repo: gh("Easy-homepage"),
    stack: ["React", "Vite", "Canvas"],
    desc: { zh: "就是你正在看的这个主页。", en: "The page you are looking at." },
    plain: { zh: "你现在看到的这张地图。", en: "The map you're looking at." },
  },
];

// Public repos get their latest push date from the server-side sync.
const repoByName = Object.fromEntries(githubRepos.map((repo) => [repo.name, repo]));
export const PROJECTS = BASE_PROJECTS.map((project) => {
  const live = project.repo ? repoByName[project.name] : null;
  return live ? { ...project, pushed: live.pushed } : project;
});

export const linkOf = (project) => (project.live && project.linkPublic !== false ? project.live : null);

// Public repos created after this snapshot that aren't listed above yet.
const SNAPSHOT = "2026-10-17";
export const NEW_REPOS = githubRepos.filter(
  (repo) => repo.created > SNAPSHOT && !BASE_PROJECTS.some((project) => project.name === repo.name),
);

export const INFRA = [
  {
    id: "srv",
    name: "mosuyang.org",
    cluster: "infra",
    desc: {
      zh: "一台自建的云服务器，用 Docker 和 Nginx 承载所有线上项目。",
      en: "A self-hosted cloud server running every live project on Docker and Nginx.",
    },
  },
  {
    id: "gpu",
    name: "GPU · ComfyUI",
    cluster: "infra",
    desc: {
      zh: "AI-Video-skill 用来出图、超分和生成视频的自建算力。",
      en: "Self-hosted GPU that AI-Video-skill uses for images, upscaling, and video.",
    },
  },
];

// Blog categories are grouped into a few topics so the graph stays readable.
const TOPIC_DEFS = [
  { id: "ba", zh: "Agent 笔记", en: "Agent notes", categories: ["Agent", "workflow", "LangChain"] },
  { id: "bm", zh: "多模态", en: "Multimodal", categories: ["MultiModal"] },
  { id: "bc", zh: "区块链", en: "Blockchain", categories: ["BlockChain", "solana"] },
  { id: "bl", zh: "LLM 应用", en: "LLM apps", categories: ["LLM", "RAG", "KG", "OpenAI", "AI", "AI大模型之美"] },
  { id: "bd", zh: "模型原理与部署", en: "Models and serving", categories: ["Model原理", "LLM部署", "finetuning", "RL", "Evaluate"] },
];

export const TOPICS = TOPIC_DEFS.map((topic) => ({
  ...topic,
  cluster: "blog",
  count: blog.posts.filter((post) => post.categories.some((name) => topic.categories.includes(name))).length,
}));

export const BLOG_HUB = { id: "blog", cluster: "blog", count: blog.posts.length, url: blog.url };

// Story mode: each blog topic is a road leading out from home to the projects it led to.
// A road with no projects yet is drawn fading into the distance.
export const ROADS = [
  { topic: "bl", cluster: "create", zh: "大模型应用", en: "LLM apps", places: ["nw", "rr"] },
  { topic: "ba", cluster: "agent", zh: "AI 助手", en: "AI assistants", places: ["ot", "mm", "hd"] },
  { topic: "bm", cluster: "life", zh: "图像与视频", en: "Images and video", places: ["vs", "vf"] },
  { topic: "bc", cluster: "web3", zh: "区块链", en: "Blockchain", places: ["gs", "sv", "pm"] },
  { topic: "bd", cluster: "infra", zh: "模型原理", en: "How models work", places: [] },
].map((road) => ({ ...road, count: TOPICS.find((topic) => topic.id === road.topic).count }));

// kind: flow = one project feeds another; learn = a blog topic led to it; host = deployed on.
export const EDGES = [
  { from: "nw", to: "vs", kind: "flow", why: { zh: "小说 → 分镜视频", en: "novel → video shots" } },
  { from: "vs", to: "vf", kind: "flow", why: { zh: "分镜片段 → 剪辑成片", en: "shots → edited video" } },
  { from: "vf", to: "mm", kind: "flow", why: { zh: "通过 MCP 调用生成能力", en: "calls generators over MCP" } },
  { from: "nw", to: "mm", kind: "flow", why: { zh: "划词插图需要生图", en: "illustrations need image generation" } },
  { from: "vs", to: "gpu", kind: "flow", why: { zh: "在 ComfyUI 上渲染", en: "renders on ComfyUI" } },
  { from: "gs", to: "sv", kind: "flow", why: { zh: "用技能生成项目骨架", en: "scaffolded by the skill" } },
  ...TOPICS.map((topic) => ({ from: "blog", to: topic.id, kind: "learn", why: null })),
  { from: "ba", to: "ot", kind: "learn", why: { zh: "学了 LangGraph", en: "learned LangGraph" } },
  { from: "ba", to: "mm", kind: "learn", why: { zh: "学了 MCP", en: "learned MCP" } },
  { from: "ba", to: "gs", kind: "learn", why: { zh: "学了 Agent Skills", en: "learned Agent Skills" } },
  { from: "ba", to: "vs", kind: "learn", why: { zh: "学了 Agent Skills", en: "learned Agent Skills" } },
  { from: "ba", to: "hd", kind: "learn", why: { zh: "LLM Copilot 设计", en: "LLM copilot design" } },
  { from: "bm", to: "vf", kind: "learn", why: { zh: "图像和视频生成 Agent", en: "image and video agents" } },
  { from: "bm", to: "vs", kind: "learn", why: { zh: "图像和视频生成 Agent", en: "image and video agents" } },
  { from: "bc", to: "sv", kind: "learn", why: { zh: "Solana 笔记", en: "Solana notes" } },
  { from: "bc", to: "pm", kind: "learn", why: { zh: "交易笔记", en: "trading notes" } },
  { from: "bl", to: "rr", kind: "learn", why: { zh: "LLM 应用", en: "LLM apps" } },
  { from: "bl", to: "nw", kind: "learn", why: { zh: "LLM 应用", en: "LLM apps" } },
  { from: "bd", to: "srv", kind: "learn", why: { zh: "自建模型服务", en: "self-hosted models" } },
  ...PROJECTS.filter((project) => project.live).map((project) => ({ from: "srv", to: project.id, kind: "host", why: null })),
  { from: "srv", to: "blog", kind: "host", why: null },
];

// Specific posts that led to (or came out of) a project. Matched by exact title.
export const POST_LINKS = [
  { title: "AI Agents in LangGraph", to: ["ot"] },
  { title: "MCP: Build Rich-Context AI Apps with Anthropic", to: ["mm"] },
  { title: "solana", to: ["sv"] },
  { title: "币圈交易指南", to: ["pm"] },
  { title: "Agent Skills with Anthropic", to: ["gs", "vs"] },
  { title: "solana-voting-system", to: ["sv"] },
  { title: "AI Agents for Image and Video Generation", to: ["vs", "vf"] },
  { title: "Voice for AI Agents and Applications", to: ["vf"] },
  { title: "Fast & Efficient LLM Inference with vLLM", to: ["srv"] },
  { title: "Efficiently Serving LLMs", to: ["srv"] },
];

export const NODES = [
  ...PROJECTS.map((project) => ({ ...project, type: "project" })),
  ...INFRA.map((item) => ({ ...item, type: "infra" })),
  { ...BLOG_HUB, type: "hub" },
  ...TOPICS.map((topic) => ({ ...topic, type: "topic" })),
];

export const nodeById = Object.fromEntries(NODES.map((node) => [node.id, node]));

export const projectByName = (name) =>
  PROJECTS.find((project) => project.name.toLowerCase() === name.toLowerCase() || project.id === name.toLowerCase());

export const postsForProject = (id) =>
  POST_LINKS.filter((link) => link.to.includes(id))
    .map((link) => blog.posts.find((post) => post.title === link.title))
    .filter(Boolean);

export const liveCount = PROJECTS.filter((project) => project.live).length;
