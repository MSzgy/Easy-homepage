import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { blog } from "../data/store.js";
import { PROJECTS } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { pick } from "../lib/util.js";

const LIMIT = 40;

// Subsequence match with bonuses for word starts and runs; 0 means no match.
function score(text, query) {
  const haystack = text.toLowerCase();
  let total = 0;
  let from = 0;
  let run = 0;
  for (const ch of query) {
    const at = haystack.indexOf(ch, from);
    if (at < 0) return 0;
    run = at === from ? run + 1 : 0;
    total += 1 + run * 2 + (at === 0 || /[\s\-_/·:]/.test(haystack[at - 1]) ? 3 : 0);
    from = at + 1;
  }
  return total - haystack.length * 0.01;
}

// actions: { project(id), section(id), sections: [{id, label}], commands: [{id, label, hint, run}] }
export function CommandPalette({ open, onClose, actions }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const returnFocus = useRef(null);

  const items = useMemo(
    () => [
      ...actions.sections.map((section) => ({ kind: "section", key: `s-${section.id}`, label: section.label, hint: t("palette.jump"), text: section.label, run: () => actions.section(section.id) })),
      ...PROJECTS.map((project) => ({
        kind: "project",
        key: `p-${project.id}`,
        label: project.name,
        hint: pick(project.nick, lang),
        text: `${project.name} ${project.nick.zh} ${project.nick.en} ${project.stack.join(" ")}`,
        run: () => actions.project(project.id),
      })),
      ...actions.commands.map((command) => ({ kind: "command", key: `c-${command.id}`, label: command.label, hint: command.hint ?? "", text: command.label, run: command.run })),
      ...blog.posts.map((post) => ({
        kind: "note",
        key: `n-${post.url}-${post.title}`,
        label: post.title,
        hint: post.date,
        text: `${post.title} ${post.categories.join(" ")}`,
        run: () => window.open(post.url, "_blank", "noopener"),
      })),
    ],
    [actions, t, lang],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return items.filter((item) => item.kind !== "note").concat(items.filter((item) => item.kind === "note").slice(0, 5));
    return items
      .map((item) => ({ item, s: score(item.text, q) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, LIMIT)
      .map(({ item }) => item);
  }, [items, query]);

  useEffect(() => {
    if (!open) return undefined;
    returnFocus.current = document.activeElement;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(timer);
      returnFocus.current?.focus?.();
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const runItem = (item) => {
    onClose();
    window.setTimeout(item.run, 30);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      runItem(results[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      event.preventDefault();
    }
  };

  return (
    <div className="palette-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t("palette.label")}>
        <div className="palette-input">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("palette.placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            spellCheck={false}
            autoComplete="off"
          />
          <kbd>esc</kbd>
        </div>
        <ul className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {results.length ? (
            results.map((item, index) => (
              <li
                key={item.key}
                id={`palette-${index}`}
                role="option"
                aria-selected={index === active}
                data-index={index}
                className={index === active ? "active" : ""}
                onMouseMove={() => index !== active && setActive(index)}
                onClick={() => runItem(item)}
              >
                <span className={`palette-kind ${item.kind}`}>{t(`palette.kinds.${item.kind}`)}</span>
                <span className="palette-label">{item.label}</span>
                <span className="palette-hint">{item.hint}</span>
                {index === active ? <CornerDownLeft size={13} className="palette-enter" aria-hidden="true" /> : null}
              </li>
            ))
          ) : (
            <li className="palette-empty">{t("palette.empty")}</li>
          )}
        </ul>
        <p className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t("palette.move")}</span>
          <span><kbd>↵</kbd> {t("palette.open")}</span>
          <span>{blog.posts.length} {t("palette.notesIndexed")}</span>
        </p>
      </div>
    </div>
  );
}
