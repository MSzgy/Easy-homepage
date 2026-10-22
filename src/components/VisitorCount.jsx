import { useEffect, useId, useState } from "react";
import { useStatus } from "../data/status.js";
import { useI18n } from "../i18n.jsx";
import { countryName, regionName } from "../lib/places.js";
import { fmt, prefersReducedMotion } from "../lib/util.js";

const SHOW_COUNTRIES = 6;
const SHOW_REGIONS = 8;
const STORY_PLACES = 3;

// Counts up to the target once, the first time it arrives.
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null) return undefined;
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

// Countries per visitor, from the counter (older status.json files have none).
const countriesOf = (visitors) => visitors?.countries ?? [];

function Origins({ id, visitors }) {
  const { t, lang } = useI18n();
  const countries = countriesOf(visitors);
  const shown = countries.slice(0, SHOW_COUNTRIES);
  const rest = visitors.located - shown.reduce((sum, [, n]) => sum + n, 0);
  const others = (visitors.countryCount ?? countries.length) - shown.length;
  const max = shown[0]?.[1] ?? 1;
  const unknown = visitors.total - visitors.located;
  const percent = (n) => `${Math.round((n / visitors.total) * 100)}%`;
  const regions = (visitors.regions ?? []).slice(0, SHOW_REGIONS);
  const row = (key, code, name, n, index) => (
    <li key={key} style={{ "--w": `${Math.min(1, n / max) * 100}%`, "--n": index }}>
      <code>{code}</code>
      <span className="origin-name">{name}</span>
      <i className="origin-bar" aria-hidden="true" />
      <b>{n.toLocaleString(lang)}</b>
      <small>{percent(n)}</small>
    </li>
  );

  return (
    <div className="visitor-origins glass-card" id={id}>
      <div className="log-head">
        <span className="log-dots" aria-hidden="true"><i /><i /><i /></span>
        <code>$ who --by country</code>
      </div>
      <ol>
        {shown.map(([code, n], index) => row(code, code, countryName(code, lang), n, index))}
        {rest > 0 && others > 0 ? row("rest", "··", fmt(t("visitors.others"), { n: others }), rest, shown.length) : null}
      </ol>
      {regions.length ? (
        <p className="origin-regions">
          <span>{t("visitors.regions")}</span>
          {regions.map((region) => (
            <span className="origin-chip" key={region.slice(0, 3).join("-")}>
              {regionName(region, lang)} <b>{region[3]}</b>
            </span>
          ))}
        </p>
      ) : null}
      <p className="origin-note">
        {unknown > 0 ? `${fmt(t("visitors.unknown"), { n: unknown })} · ` : ""}
        {t("visitors.note")}
      </p>
    </div>
  );
}

// Unique visitors (one per IP), from the 5-minute server-side count.
export function VisitorCount({ variant = "geek" }) {
  const { t, lang } = useI18n();
  const visitors = useStatus()?.visitors;
  const total = useCountUp(visitors?.total);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!visitors) return null;
  const number = (n) => n.toLocaleString(lang);
  const countries = countriesOf(visitors);
  const placeCount = visitors.countryCount ?? countries.length;

  if (variant === "story") {
    const names = countries.slice(0, STORY_PLACES).map(([code]) => countryName(code, lang, "long"));
    const places = names.length ? new Intl.ListFormat(lang, { type: "conjunction" }).format(names) : "";
    const from = !names.length
      ? ""
      : placeCount > names.length
        ? fmt(t("visitors.storyFromMore"), { places, n: number(placeCount), rest: number(placeCount - names.length) })
        : fmt(t("visitors.storyFrom"), { places });
    return (
      <p className="story-visitors">
        {fmt(t("visitors.story"), { total: number(total), today: number(visitors.today) })}
        {from}
      </p>
    );
  }
  return (
    <div className="visitor-block">
      <p className="visitor-line" title={visitors.since ? fmt(t("visitors.since"), { date: visitors.since }) : undefined}>
        <i aria-hidden="true" />
        <strong>{number(total)}</strong>
        <span>{t("visitors.unique")}</span>
        <span className="visitor-sep">·</span>
        <span>{fmt(t("visitors.today"), { n: number(visitors.today) })}</span>
        {placeCount ? (
          <>
            <span className="visitor-sep">·</span>
            <button type="button" className="visitor-from" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
              {fmt(t(placeCount === 1 ? "visitors.fromOne" : "visitors.from"), { n: number(placeCount) })}
              <span aria-hidden="true">{open ? "▴" : "▾"}</span>
            </button>
          </>
        ) : null}
      </p>
      {open && placeCount ? <Origins id={panelId} visitors={visitors} /> : null}
    </div>
  );
}
