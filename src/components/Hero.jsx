import { useEffect, useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { blog } from "../data/store.js";
import { PROJECTS, liveCount } from "../data/graph.js";
import { contacts, profile } from "../data/site.js";
import { useI18n } from "../i18n.jsx";
import { Heartbeat } from "./Heartbeat.jsx";
import { VisitorCount } from "./VisitorCount.jsx";

function useTypewriter(lines, { typeSpeed = 65, eraseSpeed = 40, pauseTime = 2400 } = {}) {
  const [text, setText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const currentLine = lines[lineIndex];
    let timer = 0;
    if (isTyping) {
      timer = text.length < currentLine.length
        ? window.setTimeout(() => setText(currentLine.slice(0, text.length + 1)), typeSpeed)
        : window.setTimeout(() => setIsTyping(false), pauseTime);
    } else if (text.length > 0) {
      timer = window.setTimeout(() => setText(currentLine.slice(0, text.length - 1)), eraseSpeed);
    } else {
      setLineIndex((index) => (index + 1) % lines.length);
      setIsTyping(true);
    }
    return () => window.clearTimeout(timer);
  }, [text, isTyping, lineIndex, lines, typeSpeed, eraseSpeed, pauseTime]);

  return text;
}

// Newest blog posts and project starts, merged into one log.
function useActivityLog(limit = 7) {
  return useMemo(() => {
    const writes = blog.posts.map((post) => ({ date: post.date, kind: "write", title: post.title, url: post.url }));
    const builds = PROJECTS.map((project) => ({ date: project.created, kind: "build", title: project.name, id: project.id }));
    return [...writes, ...builds].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }, [limit]);
}

export function Hero({ oRef, onSelect, onShowLive }) {
  const { t } = useI18n();
  const status = useTypewriter(profile.statusPool);
  const log = useActivityLog();

  return (
    <section className="hero" id="top" aria-labelledby="site-title">
      <div className="hero-identity">
        <p className="terminal-label">~/mosu</p>
        <h1 id="site-title" aria-label={profile.handle}>
          <span className="dashed-name" aria-hidden="true">
            M<span ref={oRef} className="solar-o">o</span>su
          </span>
          <span className="cursor">_</span>
        </h1>
        <p className="status-line">
          {status}
          <span className="typewriter-cursor">|</span>
        </p>
        <p className="hero-tagline">{t("hero.tagline")}</p>

        <div className="hero-stats">
          <a href="#blog" className="stat">
            <span className="stat-verb">{t("hero.learn")}</span>
            <strong>{blog.posts.length}</strong>
            <small>{t("hero.posts")}</small>
          </a>
          <span className="stat-arrow" aria-hidden="true">→</span>
          <a href="#graph" className="stat">
            <span className="stat-verb">{t("hero.make")}</span>
            <strong>{PROJECTS.length}</strong>
            <small>{t("hero.projects")}</small>
          </a>
          <span className="stat-arrow" aria-hidden="true">→</span>
          <a href="#graph" className="stat" onClick={onShowLive}>
            <span className="stat-verb">{t("hero.run")}</span>
            <strong>{liveCount}</strong>
            <small>{t("hero.live")}</small>
          </a>
        </div>

        <div className="contact-strip">
          {contacts.map(({ id, label, value, href, icon: Icon }) => (
            <a className="contact-pill" href={href} key={id} target={id === "email" ? undefined : "_blank"} rel="noreferrer">
              <Icon size={16} />
              <span>{label}</span>
              <small>{value}</small>
            </a>
          ))}
        </div>

        <VisitorCount />
      </div>

      <div className="hero-side">
      <div className="hero-log glass-card" aria-label="activity log">
        <div className="log-head">
          <span className="log-dots" aria-hidden="true"><i /><i /><i /></span>
          <code>$ {t("hero.log")}</code>
        </div>
        <ol>
          {log.map((entry, index) => (
            <li key={`${entry.kind}-${entry.title}`} style={{ "--n": index }}>
              <time>{entry.date}</time>
              <span className={`log-kind ${entry.kind}`}>{t(`hero.${entry.kind}`)}</span>
              {entry.url ? (
                <a href={entry.url} target="_blank" rel="noreferrer">{entry.title}</a>
              ) : (
                <button type="button" onClick={() => onSelect(entry.id)}>{entry.title}</button>
              )}
            </li>
          ))}
        </ol>
        <span className="log-caret" aria-hidden="true">▍</span>
      </div>
      <Heartbeat onSelect={onSelect} />
      </div>

      <a className="scroll-hint" href="#graph">
        <ArrowDown size={14} />
        {t("hero.scroll")}
      </a>
    </section>
  );
}
