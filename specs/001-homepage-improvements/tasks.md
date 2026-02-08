---
description: "Task list for Website Starter Page Improvements"
---

# Tasks: Website Starter Page Improvements

**Input**: Design documents from `/specs/001-homepage-improvements/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: No automated tests requested. Visual verification via
browser per quickstart.md.

**Organization**: Tasks are grouped by user story to enable
independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Move assets into place and prepare directory structure

- [x] T001 Create directory static/video/ at repository root
- [x] T002 [P] Copy future-spec/heroloop_seamless.mp4 to static/video/heroloop_seamless.mp4
- [x] T003 [P] Copy future-spec/hero_mobile_smooth.png to static/img/hero_mobile_smooth.png

**Checkpoint**: Assets are in place and served by Docusaurus at
`/video/heroloop_seamless.mp4` and `/img/hero_mobile_smooth.png`.

---

## Phase 2: User Story 1 - Dynamic Hero Background (Priority: P1) MVP

**Goal**: Replace static hero background with looping video on desktop
and optimized static image on mobile.

**Independent Test**: Open http://localhost:3000/ on desktop (>996px)
and verify video autoplays, loops, covers the hero area, and is muted.
Resize to mobile (<=996px) and verify static image covers the hero.

### Implementation for User Story 1

- [x] T004 [US1] Add useEffect/useState hook for desktop detection via matchMedia('(min-width: 997px)') in src/pages/index.tsx HomepageHeader component
- [x] T005 [US1] Add conditional `<video>` element with autoPlay, muted, loop, playsInline, poster attributes inside hero banner in src/pages/index.tsx
- [x] T006 [US1] Replace background-image with video positioning styles in .heroBanner in src/pages/index.module.css — add .heroVideo class (position absolute, object-fit cover, z-index 0)
- [x] T007 [US1] Update mobile breakpoint (max-width: 996px) in src/pages/index.module.css to use hero_mobile_smooth.png as background-image on .heroBanner::before (replacing hero-back-small.png)
- [x] T008 [US1] Add CSS fallback background-image on .heroBanner for browsers without video support in src/pages/index.module.css

**Checkpoint**: Hero section shows video on desktop, static image on
mobile. Video loops seamlessly with no audio.

---

## Phase 3: User Story 2 - Mobile Layout Restructure (Priority: P2)

**Goal**: On mobile (<=996px), all sections below hero have white
backgrounds with images displayed as inline content before text.

**Independent Test**: Open http://localhost:3000/ at 375px width.
Scroll through all sections below the hero. Verify white backgrounds
and images appearing before text content. Resize to desktop and verify
no changes to desktop layout.

### Implementation for User Story 2

- [x] T009 [P] [US2] Override DescriptionSection mobile background to white at @media (max-width: 996px) in src/components/DescriptionSection/styles.module.css
- [x] T010 [P] [US2] Override KeyBenefits mobile background to white and remove gradient pseudo-element at @media (max-width: 996px) in src/components/KeyBenefits/styles.module.css
- [x] T011 [US2] Restructure DataMeshSection mobile layout: remove absolute-positioned image overlay, show image as inline content before text at @media (max-width: 996px) in src/components/DataMeshSection/styles.module.css
- [x] T012 [P] [US2] Override SetupSection mobile background to white at @media (max-width: 996px) in src/components/SetupSection/styles.module.css
- [x] T013 [P] [US2] Override DuckDBSection mobile background to white at @media (max-width: 768px) in src/components/DuckDBSection/styles.module.css

**Checkpoint**: All sections below hero have white backgrounds on
mobile. DataMesh image shows inline before text. Desktop layout
unchanged.

---

## Phase 4: User Story 3 - Hero Text Styling (Priority: P3)

**Goal**: Desktop hero subtitle displays in color #056969.

**Independent Test**: Open http://localhost:3000/ on desktop, inspect
"One GraphQL layer for all your data." subtitle — color must be
#056969.

### Implementation for User Story 3

- [x] T014 [US3] Change .heroBanner :global(.hero__subtitle) color from #26bab5 to #056969 in desktop styles in src/pages/index.module.css

**Checkpoint**: Subtitle text is #056969 on desktop.

---

## Phase 5: User Story 4 - Impressum Page (Priority: P3)

**Goal**: Dedicated Impressum page with footer link containing
operator contact information.

**Independent Test**: Click "Impressum" link in footer from any page.
Verify page shows name, address, email in site's visual style.

### Implementation for User Story 4

- [x] T015 [P] [US4] Create src/pages/impressum.tsx with Layout wrapper displaying: Vladimir Gribanov, Filderstr. 54, 70771 Leinfelden-Echterdingen, Germany, vladimir.gribanov@gmail.com
- [x] T016 [P] [US4] Add "Impressum" link to footer in docusaurus.config.ts under a new "Legal" column

**Checkpoint**: Impressum page accessible from footer on every page,
displays correct content in site's visual style.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T017 Run yarn build and verify zero errors and zero broken link warnings
- [x] T018 Visual verification: run through quickstart.md checklist at http://localhost:3000/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (assets must be in place)
- **US2 (Phase 3)**: No dependency on US1 — can run in parallel
- **US3 (Phase 4)**: No dependency on US1 or US2 — can run in parallel
- **US4 (Phase 5)**: No dependency on any other story — can run in parallel
- **Polish (Phase 6)**: Depends on ALL user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Setup (T001-T003) for assets
- **US2 (P2)**: Independent — modifies different CSS files than US1
- **US3 (P3)**: Independent — modifies same file as US1 (index.module.css) but different selector. Can be combined with US1 to avoid conflicts.
- **US4 (P3)**: Fully independent — creates new files and modifies config only

### Within Each User Story

- CSS changes before visual verification
- Config changes can be parallelized with component changes
- Build validation after all stories complete

### Parallel Opportunities

```bash
# Phase 1: All asset copies in parallel
Task: "Copy heroloop_seamless.mp4 to static/video/"
Task: "Copy hero_mobile_smooth.png to static/img/"

# Phase 2-5: User stories can run in parallel (different files)
# Recommended: US1 + US3 together (both touch index.module.css)
# Then: US2 (5 component CSS files) + US4 (new files) in parallel

# Phase 3: All component CSS overrides in parallel
Task: "Override DescriptionSection mobile background"
Task: "Override KeyBenefits mobile background"
Task: "Override SetupSection mobile background"
Task: "Override DuckDBSection mobile background"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (move assets)
2. Complete Phase 2: User Story 1 (hero video)
3. **STOP and VALIDATE**: Test hero video on desktop + mobile
4. Commit if ready

### Incremental Delivery

1. Phase 1: Setup → Assets ready
2. Phase 2: US1 (hero video) + Phase 4: US3 (subtitle color) → Test hero section
3. Phase 3: US2 (mobile layout) → Test mobile view
4. Phase 5: US4 (Impressum) → Test footer + page
5. Phase 6: Polish → Final build validation

### Parallel Strategy

1. Complete Setup (Phase 1)
2. All user stories in parallel:
   - US1 + US3: Hero changes (same developer)
   - US2: Mobile CSS overrides
   - US4: Impressum page + config
3. Phase 6: Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US3 and US1 both modify `src/pages/index.module.css` — recommend implementing together
- No automated tests — verification is visual per quickstart.md
- Commit after each phase or logical group
