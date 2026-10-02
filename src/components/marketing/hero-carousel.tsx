"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1687422808311-a776f467a468?q=80&w=1200&auto=format&fit=crop",
    alt: "A Tanzanian small business owner smiling behind the counter of her shop",
  },
  {
    src: "https://images.unsplash.com/photo-1687422808565-929533931584?q=80&w=1200&auto=format&fit=crop",
    alt: "A market vendor giving a thumbs up at his fruit stand in Dar es Salaam",
  },
  {
    src: "https://images.unsplash.com/photo-1723221907187-3e88c1d74b99?q=80&w=1200&auto=format&fit=crop",
    alt: "A Nigerian business owner standing confidently in front of his store",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      {SLIDES.map((slide, i) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          width={1200}
          height={675}
          loading={i === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: active === i ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            onClick={() => setActive(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: active === i ? "1.25rem" : "0.375rem",
              backgroundColor: active === i ? "white" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
