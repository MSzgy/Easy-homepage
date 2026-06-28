import {
  AtSign,
  BookOpenText,
  Bot,
  Compass,
  Flame,
  Github,
  Home,
  Mail,
  Music2,
  Radio,
  Rss,
  Send,
  Sparkles,
} from "lucide-react";

export const profile = {
  handle: "Mosu",
  title: "personal terminal",
  status: "build / write / collect",
  statusPool: [
    "build / write / collect",
    "code / coffee / sleep",
    "ship / learn / repeat",
    "create / debug / deploy",
    "think / build / break / rebuild",
  ],
  quote:
    "保持好奇，持续构建。一个建立于 23 世纪的小站，存活于互联网的边缘。",
  quotePool: [
    "保持好奇，持续构建。一个建立于 23 世纪的小站，存活于互联网的边缘。",
    "弱者也能变强，前提是每天都留下一点可复用的代码。",
    "把灵感、链接、音乐和日常状态，收束到一个安静但会呼吸的主页。",
  ],
};

export const contacts = [
  { label: "GitHub", value: "github.com/yourname", href: "#", icon: Github },
  { label: "Bot", value: "AI assistant lab", href: "#", icon: Bot },
  { label: "Channel", value: "daily signal", href: "#", icon: Radio },
  { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com", icon: Mail },
  { label: "Now playing", value: "music log", href: "#", icon: Music2 },
];

export const modules = [
  {
    id: "blog",
    title: "博客",
    icon: Rss,
    href: "#",
    accent: "green",
    description: "长期文章、技术笔记、项目复盘。",
    meta: "最近更新：构建个人知识主页",
  },
  {
    id: "home",
    title: "主页",
    icon: Home,
    href: "#",
    accent: "blue",
    description: "个人状态、项目入口、灵感索引。",
    meta: "当前状态：在线构建中",
  },
  {
    id: "music",
    title: "音乐",
    icon: Music2,
    href: "#",
    accent: "cyan",
    description: "工作歌单、循环播放和今日心情。",
    meta: "正在播放：未开始",
  },
  {
    id: "about",
    title: "关于我",
    icon: Compass,
    href: "#",
    accent: "green",
    description: "程序员、创作者、工具控。",
    meta: "关键词：AI / Web / Automation",
  },
  {
    id: "bookmarks",
    title: "网址集",
    icon: BookOpenText,
    href: "#",
    accent: "blue",
    description: "收藏的工具、文档、灵感网站。",
    meta: "精选收藏：42 个",
  },
  {
    id: "trends",
    title: "今日热榜",
    icon: Flame,
    href: "#",
    accent: "hot",
    description: "每天扫一眼世界和开发者社区。",
    meta: "数据源预留：GitHub / HN / 国内热搜",
  },
];

export const playlist = [
  {
    title: "Midnight Compile",
    artist: "terminal.fm",
    length: "03:42",
  },
  {
    title: "Soft Neon Loop",
    artist: "workspace radio",
    length: "04:18",
  },
  {
    title: "Quiet Shipping",
    artist: "lofi build",
    length: "02:56",
  },
];

export const hotTopics = [
  "AI Agent 工作流",
  "Next.js 15 性能优化",
  "GitHub Trending",
  "Claude Code / Codex 自动化",
  "个人知识库与博客系统",
];

export const quickActions = [
  { label: "邮件", icon: AtSign },
  { label: "项目", icon: Sparkles },
  { label: "联系", icon: Send },
];
