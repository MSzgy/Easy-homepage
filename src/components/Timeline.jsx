import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { blog } from "../data/store.js";
import { POST_LINKS, PROJECTS, nodeById } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { daysBetween, fmt, useInView, usePinned, useScrollProgress } from "../lib/util.js";
import { SectionHead } from "./Constellation.jsx";

const POST_Y = 64;
const PROJECT_Y = 168;
const LABEL_Y = PROJECT_Y + 26;
const ROW = 16;
const PAD_X = 28;
const DAY = 864e5;
const CHAR_WIDTH = 6.7;
const PAN_WIDTH = 2.3; // pinned mode: the timeline is this many viewports wide

// Every post -> project pair with how many days separate them.
const PAIRS = POST_LINKS.flatMap((link) => {
  const post = blog.posts.find((item) => item.title === link.title);
  if (!post) return [];
  return link.to
    .map((id) => nodeById[id])
    .filter((node) => node?.created)
    .map((project) => ({ post, project, gap: daysBetween(post.date, project.created) }));
});

export function Timeline({ onFocus }) {
  const { t } = useI18n();
  const [sectionRef, inView] = useInView(0.12);
  const pinned = usePinned();
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const dateRef = useRef(null);
  const [viewport, setViewport] = useState(960);
  const [hover, setHover] = useState(null);
  const width = pinned ? Math.max(1800, Math.round(viewport * PAN_WIDTH)) : Math.max(720, viewport);

  useEffect(() => {
    const node = wrapRef.current;
    const observer = new ResizeObserver(() => setViewport(node.clientWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = useMemo(() => {
    const dates = [...blog.posts.map((post) => post.date), ...PROJECTS.map((project) => project.created)];
    const start = Math.min(...dates.map((date) => Date.parse(date))) - 30 * DAY;
    const end = Date.now() + 30 * DAY;
    const x = (date) => PAD_X + ((Date.parse(date) - start) / (end - start)) * (width - PAD_X * 2);
    const ticks = [];
    const cursor = new Date(start);
    cursor.setUTCDate(1);
    cursor.setUTCMonth(Math.ceil(cursor.getUTCMonth() / 3) * 3);
    while (cursor.getTime() < end) {
      const iso = cursor.toISOString().slice(0, 10);
      if (cursor.getTime() >= start) ticks.push({ iso, label: iso.slice(0, 7).replace("-", ".") });
      cursor.setUTCMonth(cursor.getUTCMonth() + 3);
    }
    return { x, ticks, start, end };
  }, [width]);

  // Pinned: scrolling pans the camera along the timeline, and the large date in
  // the background shows the month under the center of the screen.
  const onProgress = useCallback(
    (progress) => {
      const shift = (width - viewport) * progress;
      if (svgRef.current) svgRef.current.style.transform = `translate3d(${-shift}px, 0, 0)`;
      if (dateRef.current) {
        const at = scale.start + ((shift + viewport / 2 - PAD_X) / (width - PAD_X * 2)) * (scale.end - scale.start);
        dateRef.current.textContent = new Date(Math.min(at, Date.now())).toISOString().slice(0, 7).replace("-", ".");
      }
    },
    [width, viewport, scale],
  );
  useScrollProgress(sectionRef, pinned, onProgress);

  // Projects cluster in time, so labels go into the first row where they fit.
  const projects = useMemo(() => {
    const rowEnds = [];
    return [...PROJECTS]
      .sort((a, b) => a.created.localeCompare(b.created))
      .map((project) => {
        const x = scale.x(project.created);
        const half = (project.name.length * CHAR_WIDTH) / 2;
        const labelX = Math.min(Math.max(x, PAD_X + half), width - PAD_X - half);
        let row = rowEnds.findIndex((rowEnd) => rowEnd < labelX - half - 10);
        if (row === -1) {
          row = rowEnds.length;
          rowEnds.push(0);
        }
        rowEnds[row] = labelX + half;
        return { ...project, x, labelX, labelY: LABEL_Y + row * ROW };
      });
  }, [scale, width]);
  const height = Math.max(...projects.map((project) => project.labelY)) + 40;
  const linkedTitles = new Set(PAIRS.map((pair) => pair.post.title));
  const insights = PAIRS.filter((pair) => pair.gap >= 0).sort((a, b) => b.gap - a.gap).slice(0, 4);
  const active = (pair) => !hover || hover === pair.post.title || hover === pair.project.id;

  return (
    <section id="timeline" className={`section timeline ${inView ? "in-view" : ""} ${pinned ? "pinned" : ""}`} ref={sectionRef}>
      <div className="timeline-sticky">
      {pinned ? <p className="timeline-date" ref={dateRef} aria-hidden="true" /> : null}
      <SectionHead kicker={t("timeline.kicker")} title={t("timeline.title")} sub={t("timeline.sub")} />
      <div className="timeline-scroll glass-card" ref={wrapRef}>
        <svg width={width} height={height} role="img" aria-label={t("timeline.title")} ref={svgRef}>
          {scale.ticks.map((tick) => (
            <g key={tick.iso} className="tl-tick">
              <line x1={scale.x(tick.iso)} x2={scale.x(tick.iso)} y1={36} y2={height - 26} />
              <text x={scale.x(tick.iso)} y={height - 10}>{tick.label}</text>
            </g>
          ))}
          <line className="tl-rail" x1={PAD_X} x2={width - PAD_X} y1={POST_Y} y2={POST_Y} />
          <line className="tl-rail" x1={PAD_X} x2={width - PAD_X} y1={PROJECT_Y} y2={PROJECT_Y} />
          <text className="tl-track" x={PAD_X} y={POST_Y - 18}>{t("timeline.posts")} · {blog.posts.length}</text>
          <text className="tl-track" x={PAD_X} y={PROJECT_Y - 14}>{t("timeline.projects")} · {PROJECTS.length}</text>

          {PAIRS.map((pair, index) => {
            const x1 = scale.x(pair.post.date);
            const x2 = scale.x(pair.project.created);
            const mid = (POST_Y + PROJECT_Y) / 2;
            return (
              <path
                key={`${pair.post.title}-${pair.project.id}`}
                className={active(pair) ? "tl-arc" : "tl-arc dim"}
                style={{ "--chip": `var(--c-${pair.project.cluster})`, "--i": index }}
                pathLength="1"
                d={`M ${x1} ${POST_Y} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${PROJECT_Y}`}
              />
            );
          })}

          {blog.posts.map((post) => {
            const linked = linkedTitles.has(post.title);
            return (
              <a href={post.url} target="_blank" rel="noreferrer" key={post.url + post.title}>
                <circle
                  className={linked ? "tl-post linked" : "tl-post"}
                  cx={scale.x(post.date)}
                  cy={POST_Y}
                  r={linked ? 5 : 3.2}
                  onMouseEnter={() => linked && setHover(post.title)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${post.date} · ${post.title}`}</title>
                </circle>
              </a>
            );
          })}

          {projects.map((project) => (
            <g
              key={project.id}
              className="tl-project"
              style={{ "--chip": `var(--c-${project.cluster})` }}
              onClick={() => onFocus(project.id)}
              onMouseEnter={() => setHover(project.id)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${project.created} · ${project.name}`}</title>
              <line className="tl-leader" x1={project.x} y1={PROJECT_Y + 7} x2={project.labelX} y2={project.labelY - 11} />
              <circle cx={project.x} cy={PROJECT_Y} r={project.live ? 6.5 : 5} />
              <text x={project.labelX} y={project.labelY}>{project.name}</text>
            </g>
          ))}
        </svg>
      </div>
      <ul className="insights">
        {insights.map((pair) => (
          <li key={`${pair.post.title}-${pair.project.id}`} style={{ "--chip": `var(--c-${pair.project.cluster})` }}>
            <a href={pair.post.url} target="_blank" rel="noreferrer">{pair.post.title}</a>
            <span className="arrow">→</span>
            <button type="button" onClick={() => onFocus(pair.project.id)}>{pair.project.name}</button>
            <small>{pair.gap === 0 ? t("timeline.sameDay") : fmt(t("timeline.learnThen"), { d: pair.gap })}</small>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
