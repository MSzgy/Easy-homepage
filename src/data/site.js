import { Github, Mail, Rss } from "lucide-react";

export const profile = {
  handle: "Mosu",
  statusPool: ["learn / build / ship", "read / code / write", "ship / learn / repeat", "think / build / break / rebuild"],
  quotes: {
    zh: [
      "保持好奇，持续构建。一个建立于 23 世纪的小站，存活于互联网的边缘。",
      "弱者也能变强，前提是每天都留下一点可复用的代码。",
      "把学到的东西做成能跑的项目，再把做过的事情写下来。",
    ],
    en: [
      "Stay curious, keep building. A small site from the 23rd century, living on the edge of the internet.",
      "Anyone can get stronger, as long as they leave a little reusable code behind every day.",
      "Turn what you learn into something that runs, then write down what you built.",
    ],
  },
};

export const contacts = [
  { id: "github", label: "GitHub", value: "github.com/MSzgy", href: "https://github.com/MSzgy", icon: Github },
  { id: "blog", label: "Blog", value: "halo.mosuyang.org", href: "https://halo.mosuyang.org", icon: Rss },
  { id: "email", label: "Email", value: "byptzgy@gmail.com", href: "mailto:byptzgy@gmail.com", icon: Mail },
];
