// Tiny pub/sub that turns our own scroll container's position (see
// ScrollLayer in OceanScene.tsx) into a 0-1 "offset" that other components
// (Navbar, the ocean background, depth readout, ...) can read without
// prop-drilling.
//
// State lives on `window` rather than in module-scope variables because a
// component loaded via next/dynamic({ ssr: false }) can end up in its own
// bundle chunk with its own separate copy of this module - module-scope
// state wouldn't be shared with the copy used elsewhere (e.g. Navbar).
// `window` is the one true global no matter how many module instances
// exist.

type Listener = (offset: number) => void;

type Store = {
  offset: number;
  listeners: Set<Listener>;
};

declare global {
  interface Window {
    __scrollBridge?: Store;
  }
}

function getStore(): Store {
  if (typeof window === "undefined") {
    // SSR: no shared window, just hand back a throwaway store.
    return { offset: 0, listeners: new Set() };
  }
  if (!window.__scrollBridge) {
    window.__scrollBridge = { offset: 0, listeners: new Set() };
  }
  return window.__scrollBridge;
}

export function setScrollOffset(offset: number) {
  const store = getStore();
  if (offset === store.offset) return;
  store.offset = offset;
  store.listeners.forEach((listener) => listener(offset));
}

export function getScrollOffset() {
  return getStore().offset;
}

export function subscribeScrollOffset(listener: Listener) {
  const store = getStore();
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}
