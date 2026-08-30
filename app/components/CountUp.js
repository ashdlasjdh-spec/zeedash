"use client";
import { useEffect, useRef, useState } from "react";

// Animated number that counts up to `value` once, when it first scrolls into view.
// GPU-free and cheap: a single rAF loop with an ease-out, capped duration, that
// respects prefers-reduced-motion (renders the final value instantly) and holds a
// tabular-nums width so the surrounding layout never shifts as digits change.
export default function CountUp({ value = 0, duration = 900, className = "" }) {
  const target = Number(value) || 0;
  const [n, setN] = useState(target === 0 ? 0 : null);
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) { setN(target); done.current = true; return; }

    let raf = 0;
    const run = () => {
      done.current = true;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setN(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Only start once the tile is actually on screen (no wasted work off-screen).
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);

  return (
    <span ref={ref} className={`countup ${className}`}>
      {(n == null ? target : n).toLocaleString()}
    </span>
  );
}
