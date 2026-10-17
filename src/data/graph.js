// Projects, infrastructure, and blog topics, plus the real links between them.
// Add a project here and it shows up in the constellation, timeline, and terminal.
import blog from "./blog.json";

export const CLUSTERS = [
  { id: "create", zh: "AI 内容创作", en: "AI content creation" },
  { id: "agent", zh: "Agent 工具", en: "Agent tooling" },
  { id: "web3", zh: "Web3 实验", en: "Web3 experiments" },
  { id: "life", zh: "生活里的 AI", en: "AI in daily life" },
  { id: "infra", zh: "基础设施", en: "Infrastructure" },
  { id: "blog", zh: "博客笔记", en: "Blog notes" },
];

const gh = (name) => `https://github.com/MSzgy/${name}`;

// repo is null for private repositories: shown, but without a code link.
export const PROJECTS = [
  {
    id: "nw",
    name: "Easy-Novel-writer",
    cluster: "create",
    created: "2026-02-23",
    live: "https://novel-dev.mosuyang.org",
    repo: null,
    stack: ["Next.js", "FastAPI", "SQLAlchemy"],
    desc: {
      zh: "AI 小说创作台：续写润色、划词生成插图、按题材推荐配乐。",
      en: "AI novel studio: drafting and polishing, inline illustrations, mood music.",
    },
  },
  {
    id: "vs",
    name: "AI-Video-skill",
    cluster: "create",
    created: "2026-08-09",
    live: null,
    repo: gh("AI-Video-skill"),
    stack: ["Claude Skill", "ComfyUI", "MiniMax"],
    desc: {
      zh: "把小说、剧本或分镜表变成角色一致的连续 AI 视频，长任务可断点续跑。",
      en: "Turns a novel or script into character-consistent AI video shots, with resumable runs.",
    },
  },
  {
    id: "vf",
    name: "Easy-Video-Fun",
    cluster: "create",
    created: "2026-01-25",
    live: "https://capcut.mosuyang.org",
    repo: null,
    stack: ["Next.js", "FastAPI", "iOS"],
    desc: {
      zh: "AI 视频工作台：文案、分镜、配音、素材生成，导出剪映草稿，另有 iOS App ClipForge。",
      en: "AI video workbench: scripts, shots, voice, assets, CapCut drafts, and the ClipForge iOS app.",
    },
  },
  {
    id: "mm",
    name: "Media-MCP-Server",
    cluster: "agent",
    created: "2026-03-20",
    live: "https://mediamcp.mosuyang.org",
    repo: gh("Media-MCP-Server"),
    stack: ["TypeScript", "MCP", "Gemini / Veo"],
    desc: {
      zh: "把图片、视频、音频生成接口统一包装成 MCP 工具，任何 Agent 都能直接调用。",
      en: "Wraps image, video, and audio generation APIs as MCP tools any agent can call.",
    },
  },
  {
    id: "ot",
    name: "otter",
    cluster: "agent",
    created: "2026-08-26",
    live: null,
    repo: gh("otter"),
    stack: ["Python", "LangGraph", "Claude"],
    desc: {
      zh: "私人 Mac 工作助理：每天收集 Git 和 GitHub 上的工作痕迹，生成一份中文日报。",
      en: "Personal Mac work assistant that turns daily Git and GitHub traces into a summary.",
    },
  },
  {
    id: "gs",
    name: "generating-solana-projects",
    cluster: "web3",
    created: "2026-01-23",
    live: null,
    repo: gh("generating-solana-projects"),
    stack: ["Claude Skill", "Anchor", "Next.js"],
    desc: {
      zh: "Claude Code 技能：一句话生成完整的 Solana dApp 项目骨架。",
      en: "Claude Code skill that scaffolds a complete Solana dApp from one prompt.",
    },
  },
  {
    id: "sv",
    name: "solana-voting-system",
    cluster: "web3",
    created: "2026-01-23",
    live: "https://solana-voting.mosuyang.org",
    repo: gh("solana-voting-system"),
    stack: ["Rust", "Anchor", "Next.js"],
    desc: {
      zh: "链上投票 dApp：创建投票、用钱包签名投票、实时查看结果。",
      en: "On-chain voting dApp: create polls, vote with a wallet, watch live results.",
    },
  },
  {
    id: "pm",
    name: "PolyMarketTrade",
    cluster: "web3",
    created: "2026-04-09",
    live: null,
    repo: gh("PolyMarketTrade"),
    stack: ["TypeScript", "Polymarket CLOB"],
    desc: {
      zh: "预测市场自动交易框架，分层风控，默认只模拟、不真实下单。",
      en: "Prediction-market trading framework with layered risk checks; dry-run by default.",
    },
  },
  {
    id: "hd",
    name: "home-digital-twin",
    cluster: "life",
    created: "2026-09-27",
    live: "https://hometwin.mosuyang.org",
    repo: null,
    stack: ["TypeScript", "LLM Copilot", "Home Assistant"],
    desc: {
      zh: "住宅数字孪生：把户型、电路、网络和智能家居建成结构化数据，再配一个 AI 设计助手。",
      en: "Residential digital twin: floor plans, circuits, networking, and smart home as data, with an AI copilot.",
    },
  },
  {
    id: "rr",
    name: "regret-reverse",
    cluster: "life",
    created: "2026-05-10",
    live: "https://regret-reverse.mosuyang.org",
    repo: null,
    stack: ["Go", "Next.js", "小程序"],
    desc: {
      zh: "如果当时：输入一个后悔，看清三条人生线，拿到一个小小的反选行动。",
      en: "What if: enter a regret, see three life lines, and get one small action to take.",
    },
  },
  {
    id: "eh",
    name: "Easy-homepage",
    cluster: "life",
    created: "2026-06-28",
    live: "https://mosuyang.org",
    repo: gh("Easy-homepage"),
    stack: ["React", "Vite", "Canvas"],
    desc: {
      zh: "就是你正在看的这个主页。",
      en: "The page you are looking at.",
    },
  },
];

export const INFRA = [
  {
    id: "srv",
    name: "mosuyang.org",
    cluster: "infra",
    desc: {
      zh: "一台 Oracle ARM 云服务器，用 Docker 和 Nginx 承载所有线上项目。",
      en: "One Oracle ARM cloud server running every live project on Docker and Nginx.",
    },
  },
  {
    id: "gpu",
    name: "AMD 48G · ComfyUI",
    cluster: "infra",
    desc: {
      zh: "AI-Video-skill 的 ComfyUI 工作流按这块 AMD 48G 显卡调优。",
      en: "The AMD 48G GPU that AI-Video-skill's ComfyUI workflows are tuned for.",
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
