import { useEffect, useState } from "react";
import { useStatus } from "../data/status.js";
import { useI18n } from "../i18n.jsx";
import { fmt, prefersReducedMotion } from "../lib/util.js";

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

// Unique visitors (one per IP), from the 5-minute server-side count.
export function VisitorCount({ variant = "geek" }) {
  const { t, lang } = useI18n();
  const visitors = useStatus()?.visitors;
  const total = useCountUp(visitors?.total);
  if (!visitors) return null;
  const number = (n) => n.toLocaleString(lang);

  if (variant === "story") {
    return <p className="story-visitors">{fmt(t("visitors.story"), { total: number(total), today: number(visitors.today) })}</p>;
  }
  return (
    <p className="visitor-line" title={visitors.since ? fmt(t("visitors.since"), { date: visitors.since }) : undefined}>
      <i aria-hidden="true" />
      <strong>{number(total)}</strong>
      <span>{t("visitors.unique")}</span>
      <span className="visitor-sep">·</span>
      <span>{fmt(t("visitors.today"), { n: number(visitors.today) })}</span>
    </p>
  );
}
