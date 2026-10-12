"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Content stays visible without JavaScript; each marked item animates only once. */
export default function MotionRegion({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = [...(root.current?.querySelectorAll<HTMLElement>("[data-reveal], [data-float]") ?? [])];
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!("IntersectionObserver" in window)) return;
    const floats = elements.filter(element => element.hasAttribute("data-float"));
    const visibleFloats = new Set<Element>();
    let observer: IntersectionObserver | undefined;
    const updatePlayback = () => {
      for (const element of floats) {
        element.style.animationPlayState = !document.hidden && !preference.matches && visibleFloats.has(element) ? "running" : "paused";
      }
    };
    const observe = () => {
      observer?.disconnect();
      visibleFloats.clear();
      updatePlayback();
      if (preference.matches) return;
      observer = new IntersectionObserver(entries => {
        let order = 0;
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (element.hasAttribute("data-float")) {
            if (entry.isIntersecting) visibleFloats.add(element);
            else visibleFloats.delete(element);
          } else if (entry.isIntersecting) {
            element.style.setProperty("--reveal-delay", `${Math.min(order++, 3) * 55}ms`);
            element.dataset.revealed = "true";
            observer?.unobserve(element);
          }
        }
        updatePlayback();
      }, { threshold: 0.08 });
      elements.filter(element => !element.dataset.revealed || element.hasAttribute("data-float")).forEach(element => observer?.observe(element));
    };
    observe();
    preference.addEventListener("change", observe);
    document.addEventListener("visibilitychange", updatePlayback);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", observe);
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, []);

  return <div ref={root} className={className}>{children}</div>;
}
