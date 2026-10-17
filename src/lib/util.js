import { useEffect, useRef, useState } from "react";

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);

// Data objects carry { zh, en }; UI strings live in i18n.jsx.
export const pick = (value, lang) => (value && typeof value === "object" ? value[lang === "zh-CN" ? "zh" : "en"] ?? value.zh : value);

export const fmt = (template, vars) => template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");

export const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// "#6cffbd" from a CSS custom property -> "108, 255, 189" for rgba() in canvas code.
export function cssRgb(name, fallback = "108, 255, 189") {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
}

// Adds a one-shot "in view" flag for scroll reveal.
export function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return [ref, inView];
}

export function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}
