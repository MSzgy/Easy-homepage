import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const I18nContext = createContext(null);

const translations = {
  "zh-CN": {
    site: {
      handle: "Mosu",
      status: "build / write / collect",
      terminalLabel: "~/personal/ip",
    },
    quote: {
      refresh: "换一句",
    },
    contacts: {
      github: "GitHub",
      bot: "Bot",
      channel: "Channel",
      email: "Email",
      music: "Now playing",
    },
    music: {
      playlist: "音乐列表",
      back: "回到一言",
      play: "播放",
      pause: "暂停",
      prev: "上一首",
      next: "下一首",
      notPlaying: "未播放音乐",
      hint: "点击播放，让主页开始呼吸",
    },
    weather: {
      placeholder: "上海市 晴 26°C 东南风 <3 级",
    },
    modules: {
      title: "网站列表",
      captionHint: "键盘快捷键 ↑ ↓ ← →",
      prev: "上一个模块",
      next: "下一个模块",
    },
    boot: {
      text: "initializing personal terminal",
    },
  },
  "en-US": {
    site: {
      handle: "Mosu",
      status: "build / write / collect",
      terminalLabel: "~/personal/ip",
    },
    quote: {
      refresh: "Refresh",
    },
    contacts: {
      github: "GitHub",
      bot: "Bot",
      channel: "Channel",
      email: "Email",
      music: "Now playing",
    },
    music: {
      playlist: "Playlist",
      back: "Back to quote",
      play: "Play",
      pause: "Pause",
      prev: "Previous",
      next: "Next",
      notPlaying: "No music playing",
      hint: "Press play to breathe some life into this page",
    },
    weather: {
      placeholder: "Shanghai, Sunny 26°C SE <3",
    },
    modules: {
      title: "Web Directory",
      captionHint: "Use ↑ ↓ ← → keys",
      prev: "Previous module",
      next: "Next module",
    },
    boot: {
      text: "initializing personal terminal",
    },
  },
};

const detectLanguage = () => {
  const stored = window.localStorage?.getItem("mosu-lang");
  if (stored && translations[stored]) return stored;
  const nav = navigator.language || "zh-CN";
  if (nav.startsWith("zh")) return "zh-CN";
  return "en-US";
};

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => detectLanguage());

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage?.setItem("mosu-lang", lang);
  }, [lang]);

  const t = useCallback(
    (key) => {
      const keys = key.split(".");
      let value = translations[lang];
      for (const k of keys) {
        value = value?.[k];
      }
      return value ?? key;
    },
    [lang],
  );

  const toggleLang = useCallback(() => {
    setLang((current) => (current === "zh-CN" ? "en-US" : "zh-CN"));
  }, []);

  const value = useMemo(() => ({ lang, t, toggleLang, setLang }), [lang, t, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
