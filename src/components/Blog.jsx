import { ExternalLink } from "lucide-react";
import blog from "../data/blog.json";
import { POST_LINKS, nodeById } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { fmt, useInView } from "../lib/util.js";
import { SectionHead } from "./Constellation.jsx";

const LATEST = 6;
const linksFor = (title) => POST_LINKS.find((link) => link.title === title)?.to ?? [];

// Linked posts first, so the ones that became projects stay visible.
const featured = [
  ...blog.posts.slice(0, LATEST),
  ...blog.posts.filter((post, index) => index >= LATEST && linksFor(post.title).length),
].slice(0, LATEST + 4);

export function Blog({ onFocus }) {
  const { t } = useI18n();
  const [ref, inView] = useInView(0.15);
  const maxCount = Math.max(...blog.categories.map((category) => category.count));

  return (
    <section id="blog" className={`section blog ${inView ? "in-view" : ""}`} ref={ref}>
      <SectionHead kicker={t("blog.kicker")} title={t("blog.title")} sub={fmt(t("blog.sub"), { n: blog.posts.length })} />
      <div className="blog-layout">
        <div>
          <p className="panel-kicker">{t("blog.latest")}</p>
          <ul className="blog-list">
            {featured.map((post) => {
              const linked = linksFor(post.title);
              return (
                <li key={post.url + post.title} className="glass-card">
                  <time>{post.date}</time>
                  <a className="blog-title" href={post.url} target="_blank" rel="noreferrer">{post.title}</a>
                  <div className="blog-meta">
                    {post.categories.slice(0, 3).map((name) => <span key={name}>#{name}</span>)}
                    <ProjectChips label={t("blog.ledTo")} ids={linked.filter((id) => (nodeById[id].created ?? "") >= post.date)} onFocus={onFocus} />
                    <ProjectChips label={t("blog.related")} ids={linked.filter((id) => (nodeById[id].created ?? "") < post.date)} onFocus={onFocus} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <aside className="blog-side">
          <p className="panel-kicker">{t("blog.topics")}</p>
          <div className="tag-cloud">
            {blog.categories.map((category) => (
              <a
                key={category.name}
                href={category.url}
                target="_blank"
                rel="noreferrer"
                style={{ "--weight": 0.35 + (category.count / maxCount) * 0.65 }}
              >
                {category.name}
                <small>{category.count}</small>
              </a>
            ))}
          </div>
          <a className="action primary" href={blog.url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            {fmt(t("blog.all"), { n: blog.posts.length })}
          </a>
          <p className="fine-print">{fmt(t("blog.updated"), { date: blog.fetchedAt.slice(0, 10) })}</p>
        </aside>
      </div>
    </section>
  );
}

// "led to" only when the project started after the post; otherwise it is just related.
function ProjectChips({ label, ids, onFocus }) {
  if (!ids.length) return null;
  return (
    <span className="led-to">
      {label}
      {ids.map((id) => (
        <button type="button" key={id} onClick={() => onFocus(id)} style={{ "--chip": `var(--c-${nodeById[id].cluster})` }}>
          {nodeById[id].name}
        </button>
      ))}
    </span>
  );
}
