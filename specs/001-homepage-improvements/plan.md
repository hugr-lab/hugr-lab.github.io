# Implementation Plan: Website Starter Page Improvements

**Branch**: `001-homepage-improvements` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-homepage-improvements/spec.md`

## Summary

Replace the homepage hero section's static background image with a
looping video on desktop and an optimized static image on mobile.
Restyle hero subtitle color on desktop. Restructure mobile layout
so only the hero has a background image — all other sections get
white backgrounds with images shown as inline content. Add an
Impressum (legal notice) page with a footer link.

## Technical Context

**Language/Version**: TypeScript 5.6, React 19.0
**Primary Dependencies**: Docusaurus 3.8.0, CSS Modules, clsx
**Storage**: N/A (static site)
**Testing**: Visual verification via browser (localhost:3000)
**Target Platform**: Web (all modern browsers, desktop + mobile)
**Project Type**: Web (Docusaurus static site)
**Performance Goals**: Hero video loads without blocking page render;
mobile image < 1MB
**Constraints**: Must pass `yarn build` with zero errors; must not
break existing desktop layout for non-hero sections
**Scale/Scope**: 5 files modified, 2 files created, 2 assets moved

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Documentation Accuracy | PASS | N/A — this is a site UI change, not docs content |
| II. User-Centric Structure | PASS | Impressum page accessible from footer (1 click) |
| III. Consistency & Style | PASS | New components follow PascalCase + CSS Modules pattern; Quicksand font maintained; Impressum uses Layout for consistent chrome |
| IV. Comprehensive Examples | PASS | N/A — no feature documentation involved |
| V. Accessible & Searchable Content | PASS | Video has poster fallback; Impressum page has descriptive title |
| Build validation | PASS | `yarn build` gate will be enforced |
| Link integrity | PASS | Impressum footer link will be validated |
| Static assets in `static/` | PASS | Video and image moved to `static/video/` and `static/img/` |

## Project Structure

### Documentation (this feature)

```text
specs/001-homepage-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
├── quickstart.md        # Verification guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
static/
├── video/
│   └── heroloop_seamless.mp4    # NEW: hero video (from future-spec/)
└── img/
    └── hero_mobile_smooth.png   # NEW: mobile hero image (from future-spec/)

src/
├── pages/
│   ├── index.tsx                # MODIFIED: video element in hero
│   ├── index.module.css         # MODIFIED: video styles, mobile overrides
│   └── impressum.tsx            # NEW: Impressum page
└── components/
    ├── DescriptionSection/
    │   └── styles.module.css    # MODIFIED: mobile white background
    ├── KeyBenefits/
    │   └── styles.module.css    # MODIFIED: mobile white background
    ├── DataMeshSection/
    │   ├── index.tsx            # MODIFIED: mobile image-before-text
    │   └── styles.module.css    # MODIFIED: mobile white background
    ├── SetupSection/
    │   └── styles.module.css    # MODIFIED: mobile white background
    └── DuckDBSection/
        └── styles.module.css    # MODIFIED: mobile white background

docusaurus.config.ts             # MODIFIED: Impressum footer link
```

**Structure Decision**: Existing Docusaurus single-project structure.
No new directories except `static/video/`. All changes are
modifications to existing files plus 2 new files (impressum.tsx,
video asset directory).

## Implementation Details

### US1: Dynamic Hero Background

**Files**: `src/pages/index.tsx`, `src/pages/index.module.css`

1. In `index.tsx`, add a `useEffect` + `useState` hook to detect
   desktop viewport via `window.matchMedia('(min-width: 997px)')`.
2. Conditionally render a `<video>` element inside the hero banner
   with attributes: `autoPlay`, `muted`, `loop`, `playsInline`,
   `poster="/img/hero_mobile_smooth.png"`.
3. Video source: `/video/heroloop_seamless.mp4`.
4. Position video absolutely behind hero content via CSS:
   `position: absolute; top: 0; left: 0; width: 100%; height: 100%;
   object-fit: cover; z-index: 0`.
5. Remove the current `background-image: url('/img/hero-back.png')`
   from `.heroBanner` on desktop.
6. On mobile (<=996px), hide video, show background-image
   `hero_mobile_smooth.png` covering the hero area.
7. Move assets: `future-spec/heroloop_seamless.mp4` →
   `static/video/heroloop_seamless.mp4`;
   `future-spec/hero_mobile_smooth.png` →
   `static/img/hero_mobile_smooth.png`.

### US2: Mobile Layout Restructure

**Files**: Multiple component `styles.module.css` files

At the `@media (max-width: 996px)` breakpoint, override:
- `DescriptionSection`: `background-color: white`
- `KeyBenefits`: Remove gradient pseudo-element, set `background: white`
- `DataMeshSection`: Remove absolute-positioned image overlay,
  show image as inline block before text, `background: white`
- `SetupSection`: `background: white`
- `DuckDBSection`: `background: white`
- `ListSection`: Already shows images first on mobile — no change.

### US3: Hero Text Styling

**File**: `src/pages/index.module.css`

Change `.heroBanner :global(.hero__subtitle)` color from `#26bab5`
to `#056969` on desktop (default/non-media-query styles).

### US4: Impressum Page

**Files**: `src/pages/impressum.tsx`, `docusaurus.config.ts`

1. Create `src/pages/impressum.tsx` with `Layout` wrapper,
   displaying: name, address, email.
2. Add "Impressum" link to footer in `docusaurus.config.ts` under
   a new "Legal" column or appended to "Community" column.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
