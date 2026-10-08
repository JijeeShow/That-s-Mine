@AGENTS.md

# That's Mine

A personal self-introduction website (เว็บแนะนำตัวเอง) built with Next.js (App Router) +
TypeScript + Tailwind v4. Visual theme: the ocean. The home page is a
scroll-driven dive from the sunlit surface down to the abyssal depths -
scrolling down moves you deeper, scrolling up brings you back toward the
surface.

## Structure

- `src/app/layout.tsx` - root layout. Renders `Navbar` globally (every page).
- `src/app/page.tsx` - home page. Client-only (`next/dynamic`, `ssr: false`)
  render of `OceanScene`, since it depends on browser APIs.
- `src/components/OceanScene.tsx` - the ocean scroll experience: sky/surface
  intro that slides away as you scroll, a background that darkens through
  ocean depth zones (Surface → Sunlight → Twilight → Midnight → Abyssal),
  floating bubbles, and a live depth readout.
- `src/components/share/navbar.tsx` - site navbar. Hides itself once the
  user has scrolled a bit (works both for normal `window`-scrolled pages
  *and* for `OceanScene`'s custom scroll container - see below).
- `src/components/scrollBridge.ts` - a tiny pub/sub that shares one 0-1
  scroll "offset" between components that otherwise have no reason to know
  about each other (the ocean scroll container and the navbar).

## Important: no `@react-three/drei` `<ScrollControls>` / `<Scroll html>`

An earlier version of this page rendered a 3D character model
(`Characters_Sharky.gltf` - still present under `model/` and
`public/models/` but currently unused) using `@react-three/fiber` +
`@react-three/drei`. Both `drei`'s scroll helpers turned out to be broken in
this setup and were deliberately removed:

- `<Scroll html>` calls `ReactDOM.createRoot()` inside a `useMemo` with no
  cleanup, which throws `"you are calling createRoot() on a container that
  has already been passed to createRoot()"` under React Strict Mode /
  Fast Refresh.
- `<ScrollControls>`'s own scroll listener depends on react-three-fiber's
  async pointer-event "connect" wiring, which in practice never fired here -
  verified by manually setting `el.scrollTop` and dispatching a real
  `'scroll'` event by hand and seeing `scroll.offset` never move off `0`.

Instead, scrolling is implemented with a plain React-owned `<div
overflow-y: auto>` (see `ScrollLayer` in `OceanScene.tsx`) that listens to
the native `'scroll'` event directly and writes the computed offset into
`scrollBridge.ts`. **Do not reintroduce `<ScrollControls>` or `<Scroll
html>`** - if 3D content comes back, read the offset from `scrollBridge`
the same way `OceanScene` does, instead of drei's `useScroll()`.

`scrollBridge.ts` stores its state on `window` (not module-scope
variables) because a component loaded via `next/dynamic({ ssr: false })`
can land in its own bundle chunk with its own separate copy of the module -
module-scope state would not be shared with the copy used by `Navbar`.

## Unused leftovers from the Sharky iteration

These still exist but are not imported by any page right now:


Safe to delete if the 3D character isn't coming back; kept for now in case
it is.
