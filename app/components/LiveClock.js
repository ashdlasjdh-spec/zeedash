"use client";
import { useState, useEffect } from "react";

// Ticking clock + greeting for the Overview hero. Client-side so it uses the viewer's
// local timezone and updates every second without a re-fetch.
export default function LiveClock({ name }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now ? now.getHours() : null;
  const greeting = h == null ? "Welcome back" : h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const time = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";
  const date = now ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <div className="ov-clock-wrap">
      <div className="ov-clock mono">{time}</div>
      <div className="ov-clock-date">{date}</div>
      <div className="ov-greeting">{greeting}{name ? `, ${name}` : ""}</div>
    </div>
  );
}
