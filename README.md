# Pinterest Studio

A coded prototype of Pinterest Studio: a workspace that takes exploration beyond a pin, with a quiet, voice-first assistant. Built from the "UI Polished" Figma page.

## Flow

1. **Studio home**: swipe between project stacks, drag one up to take it into the studio.
2. **Pin extraction**: review the pins, then tap **Extract Pins**.
3. **Loading**: the Pinterest mark sweeps while the pins shuffle.
4. **Board**: a freeform canvas (pan, pinch/ctrl+scroll to zoom, drag pieces) with voice commands for Explore, Merge, Group and Notes, plus recommendations and a share sheet.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. Add `?screen=board` (or `extract`, `loading`) to jump straight to a screen.

## Stack

React, TypeScript, Vite and Framer Motion. Design tokens live in `src/index.css`. Images are in `public/img`.
