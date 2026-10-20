import { useEffect, useMemo, useState } from "react";
import { EDGES, PROJECTS, liveCount } from "../data/graph.js";
import { refreshStatus, upCount } from "../data/status.js";
import { blog, commits } from "../data/store.js";
import { useI18n } from "../i18n.jsx";

const LINE_MS = 150;
const HOLD_MS = 650;
export const BOOTED_KEY = "mosu-booted";

// systemd-style boot log built from real counts; any key or click skips it.
export function BootSequence({ onDone }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(0);
  const [services, setServices] = useState(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    refreshStatus().then((status) => status && setServices(upCount(status)));
  }, []);

  const lines = useMemo(
    () => [
      ["OK", "Mounting blog notes", `${blog.posts.length} notes`],
      ["OK", "Linking projects", `${PROJECTS.length} projects · ${EDGES.length} links`],
      ["OK", "Syncing GitHub activity", commits.length ? `${commits.length} recent commits` : "cached"],
      services
        ? [services.up === services.total ? "OK" : "WARN", "Starting live services", `${services.up}/${services.total} up`]
        : ["OK", "Starting live services", `${liveCount} deployed`],
      ["OK", "Rendering constellation", "canvas"],
      ["OK", "Reached target", "mosu.homepage"],
    ],
    [services],
  );

  useEffect(() => {
    if (shown <= lines.length) {
      const timer = window.setTimeout(() => setShown((value) => value + 1), shown === 0 ? 220 : LINE_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setLeaving(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [shown, lines.length]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(onDone, 380);
    return () => window.clearTimeout(timer);
  }, [leaving, onDone]);

  useEffect(() => {
    const skip = () => setLeaving(true);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  return (
    <div className={leaving ? "boot leaving" : "boot"} role="status" aria-label={t("boot.label")}>
      <div className="boot-log">
        <p className="boot-title">mosu.homepage · tty1</p>
        {lines.slice(0, shown).map(([state, what, detail]) => (
          <p key={what}>
            <span className={state === "OK" ? "boot-ok" : "boot-warn"}>[{state === "OK" ? "  OK  " : " WARN "}]</span> {what}
            {detail ? <span className="boot-detail"> … {detail}</span> : null}
          </p>
        ))}
        {shown > lines.length ? (
          <p className="boot-login">
            mosuyang.org login: <b>guest</b>
            <span className="boot-caret">▍</span>
          </p>
        ) : null}
      </div>
      <p className="boot-skip">{t("boot.skip")}</p>
    </div>
  );
}
