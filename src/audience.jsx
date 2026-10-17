import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// "story": cinematic map, plain words, for everyone. "geek": the full technical page.
// ?mode=geek or ?mode=story in the URL overrides the saved choice, for sharing.
const AudienceContext = createContext(null);
const MODES = ["story", "geek"];

const detectAudience = () => {
  const fromUrl = new URLSearchParams(window.location.search).get("mode");
  if (MODES.includes(fromUrl)) return fromUrl;
  const stored = window.localStorage?.getItem("mosu-audience");
  return MODES.includes(stored) ? stored : "story";
};

export function AudienceProvider({ children }) {
  const [audience, setAudience] = useState(detectAudience);

  useEffect(() => {
    document.documentElement.dataset.audience = audience;
    window.localStorage?.setItem("mosu-audience", audience);
  }, [audience]);

  const toggleAudience = useCallback(() => {
    setAudience((current) => (current === "story" ? "geek" : "story"));
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ audience, setAudience, toggleAudience }), [audience, toggleAudience]);
  return <AudienceContext.Provider value={value}>{children}</AudienceContext.Provider>;
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error("useAudience must be used within AudienceProvider");
  return ctx;
}
