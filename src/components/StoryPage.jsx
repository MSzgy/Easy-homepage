import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Code, X } from "lucide-react";
import { blog } from "../data/store.js";
import { EDGES, PROJECTS, ROADS, linkOf, liveCount, nodeById } from "../data/graph.js";
import { contacts } from "../data/site.js";
import { useStatus } from "../data/status.js";
import { useI18n } from "../i18n.jsx";
import { fmt, pick, prefersReducedMotion, useInView } from "../lib/util.js";
import { StoryMap } from "./StoryMap.jsx";
import { VisitorCount } from "./VisitorCount.jsx";

// The command palette asks story mode to show a place through this window event.
export const STORY_PLACE_EVENT = "mosu:story-place";

const STORY_FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif';
const roadOf = (id) => ROADS.find((road) => road.places.includes(id));

// Places this one is connected to: same road, or a "flow" link across roads.
const linkedPlaces = (id) => {
  const road = roadOf(id);
  const sameRoad = road ? road.places.filter((other) => other !== id) : [];
  const flows = EDGES.filter((edge) => edge.kind === "flow" && (edge.from === id || edge.to === id))
    .map((edge) => (edge.from === id ? edge.to : edge.from))
    .filter((other) => roadOf(other));
  return [...new Set([...flows, ...sameRoad])];
};

const scrollTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });

export function StoryPage({ onOpenGeek }) {
  const { t, lang } = useI18n();
  const [selectedId, setSelectedId] = useState(null);
  const [focusRoad, setFocusRoad] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const cardRef = useRef(null);
  const introRef = useRef(null);
  const viewRef = useRef({});
  const status = useStatus();

  const select = useCallback((id) => {
    setSelectedId(id);
    if (id) setFocusRoad(null);
  }, []);
  const focus = useCallback((topic) => {
    setFocusRoad(topic);
    setSelectedId(null);
  }, []);

  viewRef.current = {
    selectedId,
    focusRoad,
    hoverId,
    setHover: setHoverId,
    onSelect: select,
    onFocusRoad: focus,
    font: STORY_FONT,
    homeLabel: t("story.home"),
    roadName: (road) => pick(road, lang),
    roadNote: (road) => fmt(t(road.places.length ? "story.notes" : "story.unfinished"), { n: road.count }),
    placeName: (node) => pick(node.nick, lang),
    status,
    intro: introRef.current,
  };

  useEffect(() => {
    const onPlace = (event) => {
      select(event.detail);
      scrollTop();
    };
    window.addEventListener(STORY_PLACE_EVENT, onPlace);
    return () => window.removeEventListener(STORY_PLACE_EVENT, onPlace);
  }, [select]);

  // The card belongs to the map: close it once the visitor scrolls past the first screen.
  useEffect(() => {
    if (!selectedId) return undefined;
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5) setSelectedId(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selectedId]);

  const selected = selectedId ? nodeById[selectedId] : null;

  return (
    <div className="story">
      <StoryMap viewRef={viewRef} cardRef={cardRef} />
      <div className="story-grain" aria-hidden="true" />

      <section className="story-hero" aria-labelledby="story-title">
        <div className="story-intro" ref={introRef}>
          <p className="story-kicker">{t("story.kicker")}</p>
          <h1 id="story-title">
            <span>{t("story.title1")}</span>
            <span>{t("story.title2")}</span>
          </h1>
          <p className="story-sub">
            {fmt(t("story.sub"), { posts: blog.posts.length, projects: PROJECTS.length, live: liveCount })}
          </p>
          <p className="story-hint"><i aria-hidden="true" />{t("story.hint")}</p>
        </div>
        <a className="story-scroll" href="#places">
          <ArrowDown size={14} />
          {t("story.scroll")}
        </a>
      </section>

      {selected ? <PlaceCard node={selected} cardRef={cardRef} onSelect={select} service={status?.services?.[selected.id]} /> : null}

      <StoryPlaces onPick={(id) => { select(id); scrollTop(); }} />
      <StoryNotes />
      <StoryContact onOpenGeek={onOpenGeek} />
    </div>
  );
}

function PlaceCard({ node, cardRef, onSelect, service }) {
  const { t, lang } = useI18n();
  const road = roadOf(node.id);
  const link = linkOf(node);
  const linked = linkedPlaces(node.id);

  return (
    <aside className="place-card" ref={cardRef} aria-live="polite" style={{ "--chip": `var(--c-${road?.cluster ?? node.cluster})` }}>
      <button type="button" className="place-close" onClick={() => onSelect(null)} aria-label={t("story.close")}>
        <X size={16} />
      </button>
      {road ? <p className="place-road">{fmt(t("story.road"), { name: pick(road, lang) })}</p> : null}
      <h2>{pick(node.nick, lang)}</h2>
      <p className="place-plain">{pick(node.plain, lang)}</p>
      <p className="place-name">{node.name}</p>
      {service ? (
        <p className={service.ok ? "place-status up" : "place-status down"}>
          <i aria-hidden="true" />
          {service.ok ? fmt(t("story.running"), { ms: service.ms }) : t("story.down")}
        </p>
      ) : null}
      {link ? (
        <a className="place-visit" href={link} target="_blank" rel="noreferrer">
          {t("story.visit")} <ArrowUpRight size={15} />
        </a>
      ) : (
        <p className="place-lab">{t("story.lab")}</p>
      )}
      {linked.length ? (
        <div className="place-linked">
          <p>{t("story.linked")}</p>
          {linked.map((id) => (
            <button type="button" key={id} onClick={() => onSelect(id)} style={{ "--chip": `var(--c-${roadOf(id).cluster})` }}>
              {pick(nodeById[id].nick, lang)}
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function StoryPlaces({ onPick }) {
  const { t, lang } = useI18n();
  const [ref, inView] = useInView(0.12);
  const roads = ROADS.filter((road) => road.places.length);

  return (
    <section id="places" className={`story-section ${inView ? "in-view" : ""}`} ref={ref}>
      <header className="story-head">
        <h2>{t("story.placesTitle")}</h2>
        <p>{t("story.placesSub")}</p>
      </header>
      <div className="story-roads">
        {roads.map((road, roadIndex) => (
          <div className="story-road" key={road.topic} style={{ "--chip": `var(--c-${road.cluster})`, "--i": roadIndex }}>
            <p className="story-road-name">
              {pick(road, lang)}
              <small>{fmt(t("story.notes"), { n: road.count })}</small>
            </p>
            <ul>
              {road.places.map((id) => {
                const node = nodeById[id];
                const link = linkOf(node);
                return (
                  <li key={id}>
                    <button type="button" className="story-place" onClick={() => onPick(id)}>
                      <span className="story-place-nick">{pick(node.nick, lang)}</span>
                      <span className="story-place-plain">{pick(node.plain, lang)}</span>
                    </button>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" aria-label={`${t("story.visit")} ${pick(node.nick, lang)}`}>
                        <ArrowUpRight size={16} />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoryNotes() {
  const { t } = useI18n();
  const [ref, inView] = useInView(0.2);
  const latest = useMemo(() => blog.posts.slice(0, 3), []);

  return (
    <section id="notes" className={`story-section story-notes ${inView ? "in-view" : ""}`} ref={ref}>
      <header className="story-head">
        <h2>{t("story.notesTitle")}</h2>
      </header>
      <ol>
        {latest.map((post, index) => (
          <li key={post.url + post.title} style={{ "--i": index }}>
            <time>{post.date}</time>
            <a href={post.url} target="_blank" rel="noreferrer">{post.title}</a>
          </li>
        ))}
      </ol>
      <a className="story-more" href={blog.url} target="_blank" rel="noreferrer">
        {fmt(t("story.notesAll"), { n: blog.posts.length })} <ArrowUpRight size={15} />
      </a>
    </section>
  );
}

function StoryContact({ onOpenGeek }) {
  const { t } = useI18n();
  const [ref, inView] = useInView(0.3);

  return (
    <section id="contact" className={`story-section story-contact ${inView ? "in-view" : ""}`} ref={ref}>
      <header className="story-head">
        <h2>{t("story.contactTitle")}</h2>
      </header>
      <div className="story-contacts">
        {contacts.map(({ id, label, value, href, icon: Icon }) => (
          <a href={href} key={id} target={id === "email" ? undefined : "_blank"} rel="noreferrer">
            <Icon size={18} />
            <span>{label}</span>
            <small>{value}</small>
          </a>
        ))}
      </div>
      <VisitorCount variant="story" />
      <button type="button" className="story-geek" onClick={onOpenGeek}>
        <Code size={16} />
        {t("story.geekCta")}
      </button>
      <p className="story-fine">© {new Date().getFullYear()} Mosu · mosuyang.org</p>
    </section>
  );
}
