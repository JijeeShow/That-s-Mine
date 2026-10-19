// Tiny pub/sub sharing the page's scroll position between components that
// don't know about each other (Navbar, the ocean layers). OceanScene's
// ScrollDriver is the only writer.
//
// State lives on `window`, not in module scope, because a component loaded
// via next/dynamic({ ssr: false }) can land in its own bundle chunk with its
// own copy of this module - `window` is the one true global.

import { useSyncExternalStore } from "react";

type Listener = (offset: number) => void;

type Store = {
  offset: number; // 0-1 fraction of the ocean track scrolled
  px: number; // raw px into the track, for anything that must finish after an exact distance
  listeners: Set<Listener>;
};

declare global {
  interface Window {
    __scrollBridge?: Store;
  }
}

const newStore = (): Store => ({ offset: 0, px: 0, listeners: new Set() });

function getStore(): Store {
  if (typeof window === "undefined") return newStore(); // SSR: throwaway store
  return (window.__scrollBridge ??= newStore());
}

export function setScrollOffset(offset: number, px: number = 0) {
  const store = getStore();
  if (offset === store.offset && px === store.px) return;
  store.offset = offset;
  store.px = px;
  store.listeners.forEach((listener) => listener(offset));
}

export const getScrollOffset = () => getStore().offset;
export const getScrollPx = () => getStore().px;

export function subscribeScrollOffset(listener: Listener) {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export const useScrollOffset = () => useSyncExternalStore(subscribeScrollOffset, getScrollOffset, () => 0);
export const useScrollPx = () => useSyncExternalStore(subscribeScrollOffset, getScrollPx, () => 0);
