"use client";

import { useEffect, useState } from "react";
import { scrollToSection } from "@/components/scrollBridge";

// section = a target OceanScene publishes (see setSectionTargets).
const NAV_LINKS = [
  { section: "home", label: "Home" },
  { section: "about", label: "About" },
  { section: "projects", label: "Projects" },
  { section: "contact", label: "Contact" },
];

// Always shown near the top. Further down it slides away while scrolling down and comes back once
// you scroll up by SHOW_AFTER_UP_PX, so it's there when you reach for it but out of the scene otherwise.
const ALWAYS_SHOW_PX = 250;
const SHOW_AFTER_UP_PX = 40;
const HIDE_AFTER_DOWN_PX = 8; // ignores tiny jitters (momentum tail, trackpad noise)

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let travel = 0; // px moved in the current direction: + down, - up
    const handleScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy === 0) return;
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy; // restart the count on a direction change
      if (y < ALWAYS_SHOW_PX || travel <= -SHOW_AFTER_UP_PX) setHidden(false);
      else if (travel >= HIDE_AFTER_DOWN_PX) {
        setHidden(true);
        setOpen(false); // don't leave the mobile menu open behind a hidden bar
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Glides to the section on the ocean timeline; the URL stays as it is.
  const goTo = (section: string) => {
    setOpen(false);
    scrollToSection(section);
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b border-white/15 bg-[#0d3d50]/60 shadow-[0_4px_30px_rgba(0,0,0,0.15)]
        transition-[opacity,transform] duration-300 ease-in-out
        ${
        hidden ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => goTo("home")}
          className="cursor-pointer text-lg font-semibold tracking-wide text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]"
        >
          That&apos;s Mine
        </button>

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 text-sm font-medium uppercase tracking-wider text-white/80 sm:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.section}>
              <button
                type="button"
                onClick={() => goTo(link.section)}
                className="cursor-pointer uppercase tracking-wider transition-colors hover:text-white"
              >
                {link.label}
              </button>
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
        <ul className="flex flex-col gap-1 border-t border-white/15 bg-[#0d3d50]/85 px-6 py-4 text-sm font-medium uppercase tracking-wider text-white/80 sm:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.section}>
              <button
                type="button"
                onClick={() => goTo(link.section)}
                className="block w-full cursor-pointer rounded-md px-2 py-2 text-left uppercase tracking-wider transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
