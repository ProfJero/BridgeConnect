"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Swipeable banner carousel built on CSS scroll-snap (native momentum on
 * phones). Autoplays every 5s unless the user interacts or prefers reduced
 * motion; dots are real buttons for keyboard and screen-reader users.
 */
export function Carousel({ children, label }: { children: React.ReactNode; label: string }) {
  const slides = React.Children.toArray(children);
  const ref = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const goTo = React.useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => goTo((index + 1) % slides.length), 5000);
    return () => window.clearInterval(t);
  }, [index, paused, slides.length, goTo]);

  return (
    <section aria-roledescription="carousel" aria-label={label} className="space-y-2">
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
        onPointerDown={() => setPaused(true)}
        onFocus={() => setPaused(true)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="w-full shrink-0 snap-center"
          >
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => {
                setPaused(true);
                goTo(i);
              }}
              className={cn("h-1.5 rounded-full bg-muted-foreground/30 transition-all duration-300", i === index ? "w-5 bg-primary" : "w-1.5")}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
