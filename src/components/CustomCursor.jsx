import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return undefined;

    let frameId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;

    const commit = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
      ringRef.current?.style.setProperty("transform", `translate3d(${ringX}px, ${ringY}px, 0)`);
      frameId = window.requestAnimationFrame(commit);
    };

    const onMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const onOver = (event) => {
      if (event.target.closest("button, a")) {
        document.documentElement.classList.add("cursor-armed");
      }
    };

    const onOut = (event) => {
      if (event.target.closest("button, a")) {
        document.documentElement.classList.remove("cursor-armed");
      }
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    commit();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.documentElement.classList.remove("cursor-armed");
    };
  }, []);

  return (
    <>
      <span className="cursor-dot" ref={dotRef} aria-hidden="true" />
      <span className="cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}
