// Live app status from /data/status.json (written every 5 minutes on the server).
// One shared copy: the heartbeat panel, terminal `top`, map glow, and boot
// sequence all subscribe here. Missing file (dev, first deploy) = null.
import { useEffect, useState } from "react";

const REFRESH_MS = 5 * 60 * 1000;
let status = null;
let timer = 0;
let inflight = null;
const listeners = new Set();

export function refreshStatus() {
  inflight ??= fetch("/data/status.json", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (data?.services) {
        status = data;
        listeners.forEach((listener) => listener(status));
      }
      return status;
    })
    .catch(() => status)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const getStatus = () => status;

export function useStatus() {
  const [value, setValue] = useState(status);
  useEffect(() => {
    listeners.add(setValue);
    if (!status) refreshStatus();
    if (!timer) timer = window.setInterval(refreshStatus, REFRESH_MS);
    return () => {
      listeners.delete(setValue);
      if (!listeners.size) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
  }, []);
  return value;
}

export const upCount = (data) => {
  const services = Object.values(data?.services ?? {});
  return { up: services.filter((service) => service.ok).length, total: services.length };
};
