import React, { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { cn } from "../../lib/utils";

export function SpotlightNavbar({
  items = [
    { label: "Overview", href: "/" },
    { label: "Watchlist & Thesis", href: "/watchlist" },
    { label: "Timeline Replay", href: "/replay" },
  ],
  className,
  activeHref = "/",
  onItemClick,
}) {
  const navRef = useRef(null);
  const activeIndex = Math.max(0, items.findIndex((i) => i.href === activeHref));
  const [hoverX, setHoverX] = useState(null);

  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;

    const handleMouseMove = (e) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;

        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);

    if (activeItem) {
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;

      animate(ambienceX.current, targetX, {
        type: "spring",
        stiffness: 220,
        damping: 22,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    }
  }, [activeIndex]);

  return (
    <div className={cn("relative flex items-center", className)}>
      <nav
        ref={navRef}
        className={cn(
          "relative h-10 rounded-full transition-all duration-300 overflow-hidden",
          "bg-[#0d0d0d]/90 border border-[#222222] shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md"
        )}
        style={{
          "--spotlight-color": "rgba(50, 213, 131, 0.18)",
          "--ambience-color": "#32d583",
        }}
      >
        <ul className="relative flex items-center h-full px-1.5 z-[10]">
          {items.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <li key={item.href} className="relative h-full flex items-center justify-center">
                <a
                  href={item.href}
                  data-index={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    onItemClick?.(item, idx);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium tracking-tight transition-colors duration-200 rounded-full",
                    "focus-visible:outline-none",
                    isActive
                      ? "text-white font-semibold"
                      : "text-[#8a8a8a] hover:text-white"
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* 1. Moving Spotlight (Follows cursor) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-full z-[1] transition-opacity duration-300"
          style={{
            opacity: hoverX !== null ? 1 : 0,
            background: `radial-gradient(110px circle at var(--spotlight-x, 50%) 100%, var(--spotlight-color) 0%, transparent 65%)`,
          }}
        />

        {/* 2. Active Ambience Beam (Anchors under active item) */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
          style={{
            background: `radial-gradient(55px circle at var(--ambience-x, 50%) 0%, var(--ambience-color) 0%, transparent 100%)`,
          }}
        />
      </nav>
    </div>
  );
}
