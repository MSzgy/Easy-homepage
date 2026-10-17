import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Github, Lock } from "lucide-react";
import { blog } from "../data/store.js";
import { CLUSTERS, EDGES, NODES, PROJECTS, linkOf, nodeById, postsForProject } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { cssRgb, fmt, pick, prefersReducedMotion, useInView } from "../lib/util.js";

// Where each cluster settles, as fractions of the stage. The center stays clear for the sun.
const ANCHORS = {
  create: [0.22, 0.3],
  agent: [0.5, 0.13],
  web3: [0.8, 0.27],
  life: [0.79, 0.74],
  infra: [0.5, 0.87],
  blog: [0.2, 0.72],
};
const centerClear = (width) => (width < 520 ? 64 : 100);
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const FALLBACK_RGB = { create: "255, 135, 95", agent: "108, 255, 189", web3: "185, 140, 255", life: "114, 201, 255", infra: "170, 182, 178", blog: "255, 180, 114" };

const radius = (node) =>
  node.type === "project" ? (node.live ? 7 : 5.5) : node.type === "infra" ? 8 : node.type === "hub" ? 9.5 : 5.5;

function useNodeLabel() {
  const { lang, t } = useI18n();
  return (node) => {
    if (node.type === "topic") return `${pick(node, lang)} ×${node.count}`;
    if (node.type === "hub") return `${t("graph.blogHub")} · ${node.count}`;
    return node.name;
  };
}

const neighbors = (id) => EDGES.filter((edge) => edge.from === id || edge.to === id);

export function Constellation({ stageRef, selectedId, onSelect, cluster, onCluster, liveOnly, onLiveOnly }) {
  const { t, lang } = useI18n();
  const label = useNodeLabel();
  const canvasRef = useRef(null);
  const [hoverId, setHoverId] = useState(null);
  const [sectionRef, inView] = useInView(0.1);
  const viewRef = useRef({});
  viewRef.current = {
    hoverId,
    selectedId,
    cluster,
    liveOnly,
    label,
    onSelect,
    center: t("graph.center"),
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const context = canvas.getContext("2d");
    const reduceMotion = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let frameId = 0;
    let running = false;
    let frame = 0;
    // Draw-in on first view: edges grow out, then nodes fade in.
    let revealStart = null;
    let colors = { ...FALLBACK_RGB, text: "242, 247, 245" };

    const nodes = NODES.map((node) => ({ ...node, x: 0, y: 0, vx: 0, vy: 0 }));
    const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const edges = EDGES.map((edge) => ({ ...edge, a: byId[edge.from], b: byId[edge.to], dots: [Math.random(), (Math.random() + 0.5) % 1] }));
    let drag = null;
    let down = null;

    const readColors = () => {
      colors = { text: cssRgb("--text", "242, 247, 245") };
      CLUSTERS.forEach(({ id }) => {
        colors[id] = cssRgb(`--c-${id}`, FALLBACK_RGB[id]);
      });
    };

    const anchorOf = (node, time) => {
      const [ax, ay] = ANCHORS[node.cluster];
      const sway = reduceMotion ? 0 : Math.sin(time / 4000 + ax * 9) * 6;
      return [ax * width + sway, ay * height + (reduceMotion ? 0 : Math.cos(time / 5000 + ay * 7) * 5)];
    };

    const step = (time) => {
      nodes.forEach((node) => {
        if (node === drag) return;
        const [ax, ay] = anchorOf(node, time);
        node.vx += (ax - node.x) * 0.0026;
        node.vy += (ay - node.y) * 0.0026;
        const dx = node.x - width / 2;
        const dy = node.y - height / 2;
        const d = Math.hypot(dx, dy) || 1;
        const clear = centerClear(width) + 40;
        if (d < clear) {
          const push = ((clear - d) / clear) * 1.4;
          node.vx += (dx / d) * push;
          node.vy += (dy / d) * push;
        }
      });
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const p = nodes[i];
          const q = nodes[j];
          let dx = q.x - p.x;
          let dy = q.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const spread = width < 520 ? 96 : 140;
          if (d < spread) {
            const force = ((spread - d) / spread) * 0.85;
            dx /= d;
            dy /= d;
            p.vx -= dx * force;
            p.vy -= dy * force;
            q.vx += dx * force;
            q.vy += dy * force;
          }
        }
      }
      edges.forEach((edge) => {
        const rest = edge.kind === "host" ? 220 : edge.kind === "learn" ? 140 : 100;
        const stiffness = edge.kind === "host" ? 0.0003 : edge.kind === "learn" ? 0.0012 : 0.0032;
        const dx = edge.b.x - edge.a.x;
        const dy = edge.b.y - edge.a.y;
        const d = Math.hypot(dx, dy) || 1;
        const force = (d - rest) * stiffness;
        edge.a.vx += (dx / d) * force;
        edge.a.vy += (dy / d) * force;
        edge.b.vx -= (dx / d) * force;
        edge.b.vy -= (dy / d) * force;
      });
      nodes.forEach((node) => {
        if (node === drag) return;
        node.vx *= 0.82;
        node.vy *= 0.82;
        node.x += node.vx;
        node.y += node.vy;
        const pad = radius(node) + 8;
        node.x = Math.max(pad + 30, Math.min(width - pad - 30, node.x));
        node.y = Math.max(pad + 14, Math.min(height - pad - 18, node.y));
      });
    };

    const pickNode = (x, y) => {
      let best = null;
      let bestDistance = 22;
      nodes.forEach((node) => {
        const d = Math.hypot(node.x - x, node.y - y);
        if (d < bestDistance) {
          bestDistance = d;
          best = node;
        }
      });
      return best;
    };

    const draw = (time) => {
      const reveal = reduceMotion ? 1 : revealStart === null ? 0 : Math.min(1, (time - revealStart) / 1800);
      const { hoverId: hover, selectedId: selected, cluster: onlyCluster, liveOnly: onlyLive, label: nameOf, center } = viewRef.current;
      const focus = byId[hover] ?? byId[selected] ?? null;
      const linked = focus ? new Set([focus.id, ...neighbors(focus.id).flatMap((edge) => [edge.from, edge.to])]) : null;
      const alphaOf = (node) => {
        if (linked) return linked.has(node.id) ? 1 : 0.13;
        let alpha = 1;
        if (onlyCluster && node.cluster !== onlyCluster) alpha = 0.15;
        if (onlyLive && node.type === "project" && !node.live) alpha = 0.15;
        return alpha;
      };

      context.clearRect(0, 0, width, height);

      // Center: the sun from the background canvas sits here.
      context.strokeStyle = `rgba(${colors.text}, 0.1)`;
      context.setLineDash([3, 6]);
      context.beginPath();
      context.arc(width / 2, height / 2, centerClear(width) - 30, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      context.font = `12px ${MONO}`;
      context.textAlign = "center";
      context.fillStyle = `rgba(${colors.text}, 0.62)`;
      context.fillText(center, width / 2, height / 2 + 44);

      edges.forEach((edge, edgeIndex) => {
        const grow = Math.max(0, Math.min(1, reveal * 1.8 - (edgeIndex / edges.length) * 0.8));
        if (grow <= 0) return;
        const touchesFocus = focus && (edge.a === focus || edge.b === focus);
        const alpha = linked ? (touchesFocus ? 1 : 0.05) : Math.min(alphaOf(edge.a), alphaOf(edge.b));
        const rgb = edge.kind === "learn" ? colors.blog : edge.kind === "host" ? colors.infra : colors[edge.a.cluster];
        const base = edge.kind === "host" ? 0.14 : edge.kind === "learn" ? 0.34 : 0.5;
        context.setLineDash(edge.kind === "learn" ? [3, 4] : []);
        context.lineWidth = edge.kind === "flow" ? 1.4 : 1;
        context.strokeStyle = `rgba(${rgb}, ${base * alpha})`;
        context.beginPath();
        context.moveTo(edge.a.x, edge.a.y);
        context.lineTo(edge.a.x + (edge.b.x - edge.a.x) * grow, edge.a.y + (edge.b.y - edge.a.y) * grow);
        context.stroke();
        context.setLineDash([]);
        if (edge.kind === "flow" && grow >= 1) {
          if (!reduceMotion) edge.dots = edge.dots.map((value) => (value + 0.0042) % 1);
          edge.dots.forEach((value) => {
            context.fillStyle = `rgba(${rgb}, ${0.95 * alpha})`;
            context.beginPath();
            context.arc(edge.a.x + (edge.b.x - edge.a.x) * value, edge.a.y + (edge.b.y - edge.a.y) * value, touchesFocus ? 2.6 : 1.9, 0, Math.PI * 2);
            context.fill();
          });
        }
      });

      nodes.forEach((node) => {
        const alpha = alphaOf(node) * Math.min(1, reveal * 2.5);
        const rgb = colors[node.cluster];
        const r = radius(node);
        if (node.live && node.type === "project") {
          const pulse = reduceMotion ? 0 : Math.sin(time / 600 + node.x) * 1.5;
          context.fillStyle = `rgba(${rgb}, ${0.17 * alpha})`;
          context.beginPath();
          context.arc(node.x, node.y, r + 5 + pulse, 0, Math.PI * 2);
          context.fill();
        }
        if (node.type === "topic" || node.type === "hub") {
          context.strokeStyle = `rgba(${rgb}, ${alpha})`;
          context.lineWidth = 1.6;
          context.beginPath();
          context.arc(node.x, node.y, r, 0, Math.PI * 2);
          context.stroke();
          if (node.type === "hub") {
            context.fillStyle = `rgba(${rgb}, ${0.25 * alpha})`;
            context.fill();
          }
        } else if (node.type === "infra") {
          context.strokeStyle = `rgba(${rgb}, ${alpha})`;
          context.lineWidth = 1.4;
          context.strokeRect(node.x - r, node.y - r, r * 2, r * 2);
          context.fillStyle = `rgba(${rgb}, ${0.15 * alpha})`;
          context.fillRect(node.x - r, node.y - r, r * 2, r * 2);
        } else {
          context.fillStyle = `rgba(${rgb}, ${alpha})`;
          context.beginPath();
          context.arc(node.x, node.y, r, 0, Math.PI * 2);
          context.fill();
        }
        if (node === focus) {
          context.strokeStyle = `rgba(${rgb}, 0.9)`;
          context.lineWidth = 1;
          context.beginPath();
          context.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
          context.stroke();
        }
        // Narrow screens: topic labels only when relevant, to avoid overlap.
        const compact = width < 520;
        if (compact && node.type === "topic" && !(linked && linked.has(node.id))) return;
        context.font = `${node.type === "topic" || compact ? 10.5 : 11.5}px ${MONO}`;
        context.fillStyle = `rgba(${colors.text}, ${alpha * (node === focus ? 1 : 0.74)})`;
        const text = nameOf(node);
        const half = context.measureText(text).width / 2 + 4;
        context.fillText(text, Math.min(Math.max(node.x, half), width - half), node.y + r + 15);
      });
    };

    const loop = (time) => {
      if (frame++ % 30 === 0) readColors();
      step(time);
      draw(time);
      frameId = running ? window.requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (running) return;
      running = true;
      if (revealStart === null) revealStart = performance.now();
      frameId = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frameId);
    };

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (!nextWidth || !nextHeight) return;
      const first = width === 0;
      nodes.forEach((node) => {
        if (first) {
          const [ax, ay] = ANCHORS[node.cluster];
          node.x = ax * nextWidth + (Math.random() - 0.5) * 60;
          node.y = ay * nextHeight + (Math.random() - 0.5) * 60;
        } else {
          node.x *= nextWidth / width;
          node.y *= nextHeight / height;
        }
      });
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (first) for (let i = 0; i < 320; i += 1) step(0);
      readColors();
      draw(performance.now());
    };

    const position = (event) => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const onPointerMove = (event) => {
      const [x, y] = position(event);
      if (drag) {
        drag.x = x;
        drag.y = y;
        drag.vx = 0;
        drag.vy = 0;
        return;
      }
      const node = pickNode(x, y);
      document.documentElement.classList.toggle("cursor-armed", Boolean(node));
      setHoverId(node?.id ?? null);
    };
    const onPointerDown = (event) => {
      const [x, y] = position(event);
      const node = pickNode(x, y);
      down = { x, y, node };
      if (node && event.pointerType === "mouse") {
        drag = node;
        canvas.setPointerCapture(event.pointerId);
      }
    };
    const onPointerUp = (event) => {
      if (!down) return;
      const [x, y] = position(event);
      if (Math.hypot(x - down.x, y - down.y) < 6) {
        const { selectedId: current, onSelect: select } = viewRef.current;
        select(down.node ? (down.node.id === current ? null : down.node.id) : null);
      }
      drag = null;
      down = null;
    };
    const onPointerLeave = () => {
      document.documentElement.classList.remove("cursor-armed");
      setHoverId(null);
    };
    const onPointerCancel = () => {
      drag = null;
      down = null;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointercancel", onPointerCancel);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    visibility.observe(stage);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [stageRef]);

  const selected = nodeById[selectedId] ?? null;

  return (
    <section id="graph" className={`section constellation ${inView ? "in-view" : ""}`} ref={sectionRef}>
      <SectionHead kicker={t("graph.kicker")} title={t("graph.title")} sub={t("graph.sub")} />
      <div className="constellation-layout">
        <div className="constellation-main">
          <div className="filter-row" role="toolbar">
            <button type="button" className={!cluster ? "chip active" : "chip"} onClick={() => onCluster(null)}>
              {t("graph.all")}
            </button>
            {CLUSTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={cluster === item.id ? "chip active" : "chip"}
                style={{ "--chip": `var(--c-${item.id})` }}
                onClick={() => onCluster(cluster === item.id ? null : item.id)}
              >
                <i className="dot" />
                {pick(item, lang)}
              </button>
            ))}
            <button type="button" className={liveOnly ? "chip live active" : "chip live"} onClick={() => onLiveOnly(!liveOnly)} aria-pressed={liveOnly}>
              <i className="dot pulse" />
              {t("graph.liveOnly")}
            </button>
          </div>
          <div className="constellation-stage" ref={stageRef}>
            <canvas ref={canvasRef} aria-label={t("graph.title")} role="img" />
          </div>
          <p className="legend">
            <span>{t("graph.legend.flow")}</span>
            <span>{t("graph.legend.learn")}</span>
            <span>{t("graph.legend.host")}</span>
          </p>
        </div>
        <aside className="constellation-panel glass-card" aria-live="polite">
          {selected ? (
            <NodeDetails node={selected} onSelect={onSelect} label={label} />
          ) : (
            <ProjectIndex onSelect={onSelect} liveOnly={liveOnly} cluster={cluster} label={label} />
          )}
        </aside>
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, sub }) {
  return (
    <header className="section-head" data-num={kicker.slice(0, 2)}>
      <p className="kicker">{kicker}</p>
      <h2>{title}</h2>
      {sub ? <p className="section-sub">{sub}</p> : null}
    </header>
  );
}

function ProjectIndex({ onSelect, liveOnly, cluster, label }) {
  const { t, lang } = useI18n();
  const groups = CLUSTERS.filter((item) => item.id !== "blog" && item.id !== "infra");

  return (
    <div className="panel-index">
      <p className="panel-kicker">{t("graph.index")}</p>
      {groups.map((group) => {
        const items = PROJECTS.filter((project) => project.cluster === group.id);
        const dim = cluster && cluster !== group.id;
        return (
          <div className={dim ? "index-group dim" : "index-group"} key={group.id} style={{ "--chip": `var(--c-${group.id})` }}>
            <h3><i className="dot" />{pick(group, lang)}</h3>
            <ul>
              {items.map((project) => (
                <li key={project.id} className={liveOnly && !project.live ? "dim" : ""}>
                  <button type="button" onClick={() => onSelect(project.id)}>
                    <span>{project.name}</span>
                    {project.live ? <small className="live-tag">{t("graph.live")}</small> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="index-group" style={{ "--chip": "var(--c-infra)" }}>
        <h3><i className="dot" />{t("graph.infra")}</h3>
        <ul>
          {["srv", "gpu", "blog"].map((id) => (
            <li key={id}>
              <button type="button" onClick={() => onSelect(id)}>
                <span>{label(nodeById[id])}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NodeDetails({ node, onSelect, label }) {
  const { t, lang } = useI18n();
  const clusterInfo = CLUSTERS.find((item) => item.id === node.cluster);
  const links = neighbors(node.id);
  const posts = useMemo(() => {
    if (node.type === "project" || node.type === "infra") return postsForProject(node.id);
    if (node.type === "topic") return blog.posts.filter((post) => post.categories.some((name) => node.categories.includes(name))).slice(0, 4);
    if (node.type === "hub") return blog.posts.slice(0, 4);
    return [];
  }, [node]);
  const categoryUrl = node.type === "topic" ? blog.categories.find((item) => node.categories.includes(item.name))?.url : null;

  return (
    <div className="panel-details" style={{ "--chip": `var(--c-${node.cluster})` }}>
      <button type="button" className="panel-back" onClick={() => onSelect(null)}>
        <ArrowLeft size={14} />
        {t("graph.back")}
      </button>
      <p className="panel-kicker"><i className="dot" />{pick(clusterInfo, lang)}</p>
      <h3>{label(node)}</h3>
      <div className="badges">
        {node.live ? <span className="badge live">{t("graph.live")}</span> : null}
        {node.type === "project" && !node.repo ? <span className="badge"><Lock size={11} />{t("graph.private")}</span> : null}
        {node.created ? <span className="badge">{t("graph.since")} {node.created}</span> : null}
        {node.count ? <span className="badge">{fmt(t("graph.postsCount"), { n: node.count })}</span> : null}
      </div>
      {node.desc ? <p className="panel-desc">{pick(node.desc, lang)}</p> : null}
      {node.type === "topic" ? <p className="panel-desc mono">{node.categories.join(" · ")}</p> : null}
      {node.stack ? (
        <ul className="stack">
          {node.stack.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}

      <div className="panel-actions">
        {linkOf(node) ? (
          <a className="action primary" href={linkOf(node)} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />{t("graph.visit")}
          </a>
        ) : null}
        {node.repo ? (
          <a className="action" href={node.repo} target="_blank" rel="noreferrer">
            <Github size={14} />{t("graph.code")}
          </a>
        ) : null}
        {categoryUrl ? (
          <a className="action" href={categoryUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />{t("graph.openCategory")}
          </a>
        ) : null}
        {node.type === "hub" ? (
          <a className="action primary" href={node.url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />{t("graph.openBlog")}
          </a>
        ) : null}
      </div>

      <p className="panel-kicker">{t("graph.links")}</p>
      <ul className="link-list">
        {links.map((edge) => {
          const other = nodeById[edge.from === node.id ? edge.to : edge.from];
          return (
            <li key={`${edge.from}-${edge.to}`}>
              <span className={`kind ${edge.kind}`}>{t(`graph.kinds.${edge.kind}`)}</span>
              <button type="button" onClick={() => onSelect(other.id)}>{label(other)}</button>
              {edge.why ? <small>{pick(edge.why, lang)}</small> : null}
            </li>
          );
        })}
      </ul>

      {posts.length ? (
        <>
          <p className="panel-kicker">{node.type === "topic" || node.type === "hub" ? t("graph.topicPosts") : t("graph.posts")}</p>
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.url + post.title}>
                <time>{post.date}</time>
                <a href={post.url} target="_blank" rel="noreferrer">{post.title}</a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
