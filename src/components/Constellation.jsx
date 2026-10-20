import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Github, Lock } from "lucide-react";
import { blog } from "../data/store.js";
import { CLUSTERS, PROJECTS, linkOf, nodeById, postsForProject } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { createConstellation, neighbors } from "../lib/constellation3d.js";
import { fmt, pick, useInView } from "../lib/util.js";

function useNodeLabel() {
  const { lang, t } = useI18n();
  return (node) => {
    if (node.type === "topic") return `${pick(node, lang)} ×${node.count}`;
    if (node.type === "hub") return `${t("graph.blogHub")} · ${node.count}`;
    return node.name;
  };
}

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
    setHover: setHoverId,
    center: t("graph.center"),
  };

  useEffect(() => createConstellation({ canvas: canvasRef.current, stage: stageRef.current, viewRef }), [stageRef]);

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
