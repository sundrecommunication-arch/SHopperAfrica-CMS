"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface HeroSliderProps {
  images: string[];
  /** Used for the images' alt text, e.g. "Adunni Fashion House banner 1". */
  label: string;
  intervalMs?: number;
}

// Fills its parent (the parent sets the height). Swipeable on phones, dots
// only when there's more than one image, and no auto-advance for visitors
// who've asked their phone to reduce motion.
export function HeroSlider({ images, label, intervalMs = 5000 }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, paused]);

  if (count === 0) return null;

  const go = (delta: number) => setCurrent((prev) => (prev + delta + count) % count);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {images.map((src, idx) => (
        <Image
          key={idx}
          src={src}
          alt={count > 1 ? `${label} ${idx + 1}` : label}
          fill
          priority={idx === 0}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className={`object-cover transition-opacity duration-700 ${idx === current ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-1.5 flex justify-center sm:bottom-3">
          {images.map((_, idx) => (
            // 24px tap target around a small visible dot.
            <button
              key={idx}
              type="button"
              aria-label={`Show image ${idx + 1} of ${count}`}
              aria-current={idx === current}
              onClick={() => setCurrent(idx)}
              className="flex h-6 w-6 items-center justify-center focus:outline-none"
            >
              <span
                className={`block h-2 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-all ${
                  idx === current ? "w-5 bg-white" : "w-2 bg-white/60"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
