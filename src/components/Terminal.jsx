import { useEffect, useRef, useState } from "react";
import { blog, commits } from "../data/store.js";
import { getStatus, refreshStatus, upCount } from "../data/status.js";
import { CLUSTERS, PROJECTS, TOPICS, linkOf, projectByName } from "../data/graph.js";
import { contacts, profile } from "../data/site.js";
import { useI18n } from "../i18n.jsx";
import { useTheme } from "../theme.jsx";
import { countryName, regionName } from "../lib/places.js";
import { fmt, pick, scrollToId } from "../lib/util.js";

const COMMANDS = ["help", "ls", "open", "visit", "blog", "whoami", "contact", "neofetch", "top", "who", "git", "reboot", "graph", "pipeline", "timeline", "theme", "mode", "lang", "date", "echo", "clear", "exit", "sudo"];
const ONLINE_SINCE = "2026-06-28";
const LOGO = ["   ▄▄▄▄▄▄▄   ", "  █ ▄▄▄▄▄ █  ", "  █ █{/}█ █  ", "  █ █▄▄▄█ █  ", "  █▄▄▄▄▄▄▄█  ", "             ", "             ", "             ", "             "];
const STACK = [...new Set(PROJECTS.flatMap((project) => project.stack))].filter((item) => ["TypeScript", "Python", "Rust", "Go", "React", "Next.js", "FastAPI"].includes(item));

const ago = (iso, lang) => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  if (Math.abs(minutes) < 1440) return rtf.format(-Math.round(minutes / 60), "hour");
  return rtf.format(-Math.round(minutes / 1440), "day");
};

// Status rows for `top`: current state plus availability over the last 6 hours.
const topRows = (status, t, lang) =>
  PROJECTS.filter((project) => status.services[project.id]).map((project) => {
    const service = status.services[project.id];
    const checks = service.history ?? [];
    const uptime = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 1000) / 10 : 0;
    return `  ${project.name.padEnd(22)} ${(service.ok ? t("term.up") : t("term.down")).padEnd(6)} ${String(service.ms ?? "—").padStart(5)} ms   ${String(uptime).padStart(5)}%   ${pick(project.nick, lang)}`;
  });

// `who`: visitors per country as a bar chart, then the top regions.
const BAR = 18;
const whoRows = (visitors, t, lang) => {
  const countries = visitors.countries ?? [];
  if (!countries.length) return [t("term.whoNone")];
  const max = countries[0][1];
  const unknown = visitors.total - visitors.located;
  const line = (code, name, n) =>
    `  ${code.padEnd(3)}${name.padEnd(12 - Math.max(0, [...name].filter((c) => c > "\u2e7f").length))} ${"█".repeat(Math.max(1, Math.round((n / max) * BAR))).padEnd(BAR)} ${String(n).padStart(5)}  ${String(Math.round((n / visitors.total) * 100)).padStart(3)}%`;
  const regions = (visitors.regions ?? []).slice(0, 8).map((region) => `${regionName(region, lang)} ${region[3]}`);
  return [
    `  ${fmt(t("term.whoHead"), { total: visitors.total, n: visitors.countryCount ?? countries.length, since: visitors.since ?? "—" })}`,
    "",
    ...countries.slice(0, 10).map(([code, n]) => line(code, countryName(code, lang), n)),
    ...(unknown > 0 ? [line("--", t("term.whoUnknown"), unknown)] : []),
    ...(regions.length ? ["", `  ${t("term.whoRegions")}: ${regions.join(" · ")}`] : []),
  ];
};

export function Terminal({ open, onClose, onFocus, onReboot }) {
  const { toggleMode, cycleColor, mode } = useTheme();
  const { t, lang, toggleLang } = useI18n();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const addLine = (prompt, output) => setHistory((lines) => [...lines, { prompt, output }]);

  const neofetch = () => {
    const { up, total } = upCount(getStatus());
    const counts = Object.entries(
      blog.posts.flatMap((post) => post.categories).reduce((acc, name) => ({ ...acc, [name]: (acc[name] ?? 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const info = [
      <><b className="tc-green">mosu</b>@<b className="tc-blue">mosuyang.org</b></>,
      <span className="tc-dim">{"─".repeat(22)}</span>,
      [t("term.nfRole"), t("term.nfRoleValue")],
      [t("term.nfOnline"), fmt(t("term.nfSince"), { date: ONLINE_SINCE })],
      [t("term.nfProjects"), `${PROJECTS.length} (${PROJECTS.filter((p) => p.live).length} ${t("term.liveTag")})`],
      [t("term.nfNotes"), `${blog.posts.length} · ${counts.map(([name, n]) => `${name} ${n}`).join(" · ")}`],
      [t("term.nfStack"), STACK.join(" · ")],
      [t("term.nfServices"), total ? `${up}/${total} ${t("term.up")}` : t("term.noStatus")],
      ...(getStatus()?.visitors ? [[t("term.nfVisitors"), fmt(t("term.nfVisitorsValue"), { total: getStatus().visitors.total, today: getStatus().visitors.today })]] : []),
      <span className="tc-swatches"><i className="tc-bg-green" /><i className="tc-bg-blue" /><i className="tc-bg-purple" /><i className="tc-bg-orange" /><i className="tc-bg-amber" /></span>,
    ];
    return (
      <div className="neofetch">
        {info.map((row, i) => (
          <div key={i}>
            <span className="tc-green">{LOGO[i] ?? " ".repeat(13)}</span>
            {"  "}
            {Array.isArray(row) ? <><span className="tc-blue">{row[0].padEnd(9)}</span> {row[1]}</> : row}
          </div>
        ))}
      </div>
    );
  };

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
          if (linkOf(project)) {
            addLine(cmd, fmt(t("term.visiting"), { url: linkOf(project) }));
            window.open(linkOf(project), "_blank", "noopener");
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
      case "neofetch":
        addLine(cmd, neofetch());
        break;
      case "git": {
        if (args[0] !== "log") {
          addLine(cmd, fmt(t("term.usage"), { usage: "git log [-n 5]" }));
          break;
        }
        const n = Math.min(12, Number(args[args.indexOf("-n") + 1]) || 6);
        addLine(
          cmd,
          commits.length
            ? commits.slice(0, n).map((c) => `${c.sha}  (${c.repo})  ${c.message}  · ${ago(c.date, lang)}`).join("\n")
            : t("term.noCommits"),
        );
        break;
      }
      case "top": {
        const show = (status) =>
          addLine(cmd, status ? [`  ${t("term.topHead")}`, ...topRows(status, t, lang), "", `  ${fmt(t("term.topChecked"), { time: ago(status.checkedAt, lang) })}`].join("\n") : t("term.noStatus"));
        const status = getStatus();
        if (status) show(status);
        else refreshStatus().then(show);
        break;
      }
      case "who": {
        const show = (status) => addLine(cmd, status?.visitors ? whoRows(status.visitors, t, lang).join("\n") : t("term.whoNone"));
        const status = getStatus();
        if (status) show(status);
        else refreshStatus().then(show);
        break;
      }
      case "reboot":
        addLine(cmd, t("term.reboot"));
        window.setTimeout(() => {
          onClose?.();
          onReboot?.();
        }, 400);
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
    const pool = name === "ls" ? ["projects", "posts", "topics"] : name === "git" ? ["log"] : PROJECTS.map((project) => project.name);
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
              {item.output ? (
                typeof item.output === "string" ? <pre className="term-output">{item.output}</pre> : <div className="term-output">{item.output}</div>
              ) : null}
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
