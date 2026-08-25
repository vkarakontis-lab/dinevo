"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky glass header. At the very top it floats over the hero with no border;
 * once the page scrolls it gains a hairline and a touch more opacity so text
 * scrolling underneath never muddies the nav.
 *
 * Only the scroll state needs the client — everything inside stays a server
 * component and is passed through as children.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "glass border-b border-border shadow-soft"
          : "border-b border-transparent bg-background/70 backdrop-blur-sm",
      )}
    >
      {children}
    </header>
  );
}
