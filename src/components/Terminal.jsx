import { useEffect, useRef, useState } from "react";
import blog from "../data/blog.json";
import { CLUSTERS, PROJECTS, TOPICS, projectByName } from "../data/graph.js";
import { contacts, profile } from "../data/site.js";
import { useI18n } from "../i18n.jsx";
import { useTheme } from "../theme.jsx";
import { fmt, pick, scrollToId } from "../lib/util.js";

const COMMANDS = ["help", "ls", "open", "visit", "blog", "whoami", "contact", "graph", "pipeline", "timeline", "theme", "mode", "lang", "date", "echo", "clear", "exit", "sudo"];

export function Terminal({ open, onClose, onFocus }) {
  const { toggleMode, cycleColor, mode } = useTheme();
  const { t, lang, toggleLang } = useI18n();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const addLine = (prompt, output) => setHistory((lines) => [...lines, { prompt, output }]);

  const findProject = (cmd, arg, usage) => {
    if (!arg) {
      addLine(cmd, fmt(t("term.usage"), { usage }));
      return null;
    }
    const project = projectByName(arg);
    if (!project) addLine(cmd, fmt(t("term.noProject"), { name: arg }));
    return project;
  };

  const runCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd) {
      addLine("", "");
      return;
    }
    setCmdHistory((list) => [...list, cmd]);
    setHistIdx(-1);
    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");

    switch (name.toLowerCase()) {
      case "help":
        addLine(cmd, t("term.help").join("\n"));
        break;
      case "whoami":
        addLine(cmd, `${profile.handle} — ${t("hero.tagline")}\n${contacts.map((c) => `  ${c.label.padEnd(8)} ${c.value}`).join("\n")}`);
        break;
      case "contact":
        addLine(cmd, contacts.map((c) => `  ${c.label.padEnd(8)} ${c.href}`).join("\n"));
        break;
      case "ls": {
        const what = (arg || "projects").toLowerCase();
        if (what === "posts") {
          addLine(cmd, blog.posts.slice(0, 10).map((post) => `  ${post.date}  ${post.title}`).join("\n"));
        } else if (what === "topics") {
          addLine(cmd, TOPICS.map((topic) => `  ${pick(topic, lang).padEnd(14)} ${topic.count}`).join("\n"));
        } else {
          addLine(
            cmd,
            CLUSTERS.filter((group) => PROJECTS.some((project) => project.cluster === group.id))
              .map((group) => {
                const rows = PROJECTS.filter((project) => project.cluster === group.id).map(
                  (project) => `  ${project.name.padEnd(28)} ${project.live ? `[${t("term.liveTag")}]` : ""}`,
                );
                return [`# ${pick(group, lang)}`, ...rows].join("\n");
              })
              .join("\n"),
          );
        }
        break;
      }
      case "open": {
        const project = findProject(cmd, arg, "open <project>");
        if (project) {
          addLine(cmd, fmt(t("term.opening"), { name: project.name }));
          window.setTimeout(() => {
            onClose?.();
            onFocus(project.id);
          }, 350);
        }
        break;
      }
      case "visit": {
        const project = findProject(cmd, arg, "visit <project>");
        if (project) {
          if (project.live) {
            addLine(cmd, fmt(t("term.visiting"), { url: project.live }));
            window.open(project.live, "_blank", "noopener");
          } else {
            addLine(cmd, fmt(t("term.noLive"), { name: project.name }));
          }
        }
        break;
      }
      case "blog":
        addLine(cmd, fmt(t("term.visiting"), { url: blog.url }));
        window.open(blog.url, "_blank", "noopener");
        break;
      case "graph":
      case "pipeline":
      case "timeline":
        onClose?.();
        scrollToId(name.toLowerCase());
        break;
      case "theme":
        cycleColor();
        addLine(cmd, t("term.theme"));
        break;
      case "mode":
        toggleMode();
        addLine(cmd, fmt(t("term.mode"), { mode: mode === "dark" ? t("term.light") : t("term.dark") }));
        break;
      case "lang":
        addLine(cmd, t("term.lang"));
        toggleLang();
        break;
      case "date":
        addLine(cmd, new Date().toLocaleString(lang));
        break;
      case "echo":
        addLine(cmd, arg);
        break;
      case "sudo":
        if (arg === "rm -rf /") {
          addLine(cmd, t("term.sudo"));
          window.setTimeout(() => {
            document.body.style.animation = "none";
            void document.body.offsetHeight;
            document.body.style.animation = "konamiShake 0.18s ease-in-out 10";
          }, 300);
        } else {
          addLine(cmd, fmt(t("term.sudoUnknown"), { arg }));
        }
        break;
      case "clear":
        setHistory([]);
        break;
      case "exit":
      case "quit":
        onClose?.();
        break;
      default:
        addLine(cmd, fmt(t("term.notFound"), { name }));
    }
  };

  const complete = () => {
    const [name, ...rest] = input.split(" ");
    if (!rest.length) {
      const match = COMMANDS.filter((command) => command.startsWith(name.toLowerCase()));
      if (match.length === 1) setInput(`${match[0]} `);
      else if (match.length > 1) addLine(input, match.join("  "));
      return;
    }
    const prefix = rest.join(" ").toLowerCase();
    const pool = name === "ls" ? ["projects", "posts", "topics"] : PROJECTS.map((project) => project.name);
    const match = pool.filter((item) => item.toLowerCase().startsWith(prefix));
    if (match.length === 1) setInput(`${name} ${match[0]}`);
    else if (match.length > 1) addLine(input, match.join("  "));
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      runCommand(input);
      setInput("");
    } else if (event.key === "Tab") {
      event.preventDefault();
      complete();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!cmdHistory.length) return;
      const next = histIdx < 0 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      setHistIdx(next >= cmdHistory.length ? -1 : next);
      setInput(next >= cmdHistory.length ? "" : cmdHistory[next] ?? "");
    } else if (event.key === "Escape") {
      onClose?.();
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setHistory([]);
    }
  };

  useEffect(() => {
    if (open) {
      setHistory([{ prompt: "", output: t("term.welcome") }]);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setHistory([]);
      setInput("");
    }
    // Only greet when the terminal opens, not on every language change.
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  if (!open) return null;

  const prompt = (
    <>
      <span className="term-user">mosu</span>
      <span className="term-at">@</span>
      <span className="term-host">homepage</span>
      <span className="term-colon">:</span>
      <span className="term-path">~</span>
      <span className="term-dollar">$</span>
    </>
  );

  return (
    <div className="terminal-overlay" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="terminal-window" role="dialog" aria-label="terminal">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="td td-red" />
            <span className="td td-yellow" />
            <span className="td td-green" />
          </div>
          <span className="terminal-title">mosu@homepage ~ zsh</span>
          <button type="button" className="terminal-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>
        <div className="terminal-body" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
          {history.map((item, idx) => (
            <div key={idx} className="terminal-line">
              {item.prompt ? (
                <div className="term-prompt">
                  {prompt}
                  <span className="term-cmd">{item.prompt}</span>
                </div>
              ) : null}
              {item.output ? <pre className="term-output">{item.output}</pre> : null}
            </div>
          ))}
          <div className="term-prompt term-input-line">
            {prompt}
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              aria-label="command"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
