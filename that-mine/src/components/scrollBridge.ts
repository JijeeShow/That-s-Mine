// Tiny pub/sub sharing the page's scroll position between components that
// don't know about each other (the ocean layers). OceanScene's
// ScrollDriver is the only writer.
//
// State lives on `window`, not in module scope, because a component loaded
// via next/dynamic({ ssr: false }) can land in its own bundle chunk with its
// own copy of this module - `window` is the one true global.

import { useSyncExternalStore } from "react";

type Store = {
  px: number; // px scrolled into the ocean track
  listeners: Set<() => void>;
};

declare global {
  interface Window {
    __scrollBridge?: Store;
    __sections?: Record<string, number>;
  }
}

const newStore = (): Store => ({ px: 0, listeners: new Set() });

function getStore(): Store {
  if (typeof window === "undefined") return newStore(); // SSR: throwaway store
  return (window.__scrollBridge ??= newStore());
}

export function setScrollPx(px: number) {
  const store = getStore();
  if (px === store.px) return;
  store.px = px;
  store.listeners.forEach((listener) => listener());
}

const getScrollPx = () => getStore().px;

function subscribe(listener: () => void) {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export const useScrollPx = () => useSyncExternalStore(subscribe, getScrollPx, () => 0);

// Window scrollY of each named section (home, about, projects, contact). The scene is pinned, so a plain
// #id anchor can't find them; OceanScene works them out from its scroll timeline and publishes them here.
export function setSectionTargets(sections: Record<string, number>) {
  window.__sections = sections;
}

// Scrolls to a published section. Returns false if it isn't known (yet), so callers can fall back.
export function scrollToSection(id: string, behavior: ScrollBehavior = "smooth") {
  const top = typeof window === "undefined" ? undefined : window.__sections?.[id];
  if (top === undefined) return false;
  window.scrollTo({ top, behavior });
  return true;
}
