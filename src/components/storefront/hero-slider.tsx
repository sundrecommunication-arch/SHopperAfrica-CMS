"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface HeroSliderProps {
  images: string[];
  intervalMs?: number;
}

export function HeroSlider({ images, intervalMs = 5000 }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!images || images.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images, intervalMs]);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-2xl">
      {images.map((src, idx) => (
        <Image
          key={idx}
          src={src}
          alt={`Hero image ${idx + 1}`}
          fill
          priority={idx === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${idx === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Simple navigation dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`w-3 h-3 rounded-full ${idx === current ? 'bg-white' : 'bg-gray-400'} focus:outline-none`}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
    </div>
  );
}
