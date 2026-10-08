"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getScrollOffset, subscribeScrollOffset } from "@/components/scrollBridge";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

// Navbar hides itself once the page has scrolled past this many pixels.
// Used for normal pages that scroll the actual window.
const HIDE_THRESHOLD = 150;

// The Sharky scene (see SharkyScrollScene.tsx) doesn't scroll the window at
// all - it scrolls its own container inside <Canvas> and only exposes
// progress as a 0-1 offset via scrollBridge.ts. ~0.05 of that progress is
// roughly equivalent to the 150px threshold above on a typical viewport.
const HIDE_THRESHOLD_OFFSET = 0.05;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [windowHidden, setWindowHidden] = useState(false);
  const canvasOffset = useSyncExternalStore(
    subscribeScrollOffset,
    getScrollOffset,
    () => 0
  );

  useEffect(() => {
    const handleScroll = () => {
      setWindowHidden(window.scrollY > HIDE_THRESHOLD);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const hidden = windowHidden || canvasOffset > HIDE_THRESHOLD_OFFSET;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-black/60 ${
        hidden ? "hidden" : ""
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          That&apos;s Mine
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="transition-colors hover:text-zinc-950 dark:hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile menu toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-950 transition-colors hover:bg-black/5 dark:text-zinc-50 dark:hover:bg-white/10 sm:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-current transition-transform ${
                open ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 bg-current transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 block h-0.5 w-5 bg-current transition-transform ${
                open ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-black/10 bg-white/95 px-6 py-4 text-sm font-medium text-zinc-700 backdrop-blur-md dark:border-white/10 dark:bg-black/90 dark:text-zinc-300 sm:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2 transition-colors hover:bg-black/5 hover:text-zinc-950 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
