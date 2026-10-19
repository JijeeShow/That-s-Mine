"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useScrollOffset } from "@/components/scrollBridge";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
];

// Hides once the window has scrolled past this many px, or the ocean track past this fraction.
const HIDE_THRESHOLD_PX = 150;
const HIDE_THRESHOLD_OFFSET = 0.05;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [windowHidden, setWindowHidden] = useState(false);
  const oceanOffset = useScrollOffset();

  useEffect(() => {
    const handleScroll = () => setWindowHidden(window.scrollY > HIDE_THRESHOLD_PX);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const hidden = windowHidden || oceanOffset > HIDE_THRESHOLD_OFFSET;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b border-white/15 bg-[#0d3d50]/35 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.15)]
        transition-opacity duration-300 ease-in-out
        ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="text-lg font-semibold tracking-wide text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]"
        >
          That&apos;s Mine
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wider text-white/80 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="transition-colors hover:text-white"
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
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 sm:hidden"
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
        <ul className="flex flex-col gap-1 border-t border-white/15 bg-[#0d3d50]/60 px-6 py-4 text-sm font-medium uppercase tracking-wider text-white/80 backdrop-blur-md sm:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2 transition-colors hover:bg-white/10 hover:text-white"
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
