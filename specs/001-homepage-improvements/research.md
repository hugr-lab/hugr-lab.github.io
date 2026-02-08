# Research: Website Starter Page Improvements

## R1: Hero Video Background Implementation

**Decision**: Use an HTML `<video>` element with `autoPlay`, `muted`,
`loop`, and `playsInline` attributes, positioned absolutely behind
the hero content with CSS `object-fit: cover`.

**Rationale**: HTML5 video with these attributes autoplays on all
modern browsers (Chrome, Firefox, Safari, Edge). The `muted` attribute
is required for autoplay policies. `playsInline` prevents iOS from
opening full-screen video. CSS `object-fit: cover` provides the same
visual behavior as `background-size: cover` for images.

**Alternatives considered**:
- CSS `background-image` with video: Not supported in CSS.
- Embedding via `<iframe>`: Adds unnecessary complexity and third-party
  dependency.
- JavaScript-driven video: Unnecessary; native HTML attributes suffice.

## R2: Mobile vs Desktop Detection Strategy

**Decision**: Use CSS media queries with breakpoint at 996px (matching
existing Docusaurus breakpoints). On desktop (>996px), render the
`<video>` element. On mobile (<=996px), hide the video via CSS and
show a background image instead. Use a React state + `useEffect` with
`matchMedia` to conditionally render the video element (avoiding
unnecessary download on mobile).

**Rationale**: The 996px breakpoint is already used throughout the
site for responsive layouts. Using `matchMedia` in React prevents the
video from being downloaded on mobile at all, saving bandwidth. CSS
`display: none` alone would still trigger the video download.

**Alternatives considered**:
- CSS-only approach with `display: none`: Still downloads video on
  mobile, wasting bandwidth.
- `<source>` with `media` attribute: Limited browser support for
  media queries on `<source>` elements.
- Server-side detection: Unnecessary complexity for a static site.

## R3: Asset File Locations

**Decision**: Move `heroloop_seamless.mp4` to `static/video/` and
`hero_mobile_smooth.png` to `static/img/`. Reference them as
`/video/heroloop_seamless.mp4` and `/img/hero_mobile_smooth.png`.

**Rationale**: Docusaurus serves files from `static/` at the site
root. Video files should be in a separate `video/` directory to
keep `img/` clean. The mobile image is `.png` (not `.jpg` as the
spec initially stated — corrected based on actual file in
`future-spec/`).

**Alternatives considered**:
- Keep in `static/img/`: Video files don't belong with images.
- Use external CDN: Unnecessary for a GitHub Pages site with
  relatively small assets.

## R4: Impressum Page Implementation

**Decision**: Create a standalone React page at `src/pages/impressum.tsx`
using the Docusaurus `Layout` component for consistent site chrome
(navbar, footer). Add a footer link in `docusaurus.config.ts`.

**Rationale**: Docusaurus pages in `src/pages/` get automatic routing.
A `.tsx` page gives full control over layout. Using `Layout` ensures
the Impressum page matches the site's visual style (Quicksand font,
color scheme, navbar, footer).

**Alternatives considered**:
- Markdown page in `docs/`: Would appear in the docs sidebar, which
  is inappropriate for a legal page.
- Standalone HTML: Would lose the site's consistent styling.
- Markdown page in `src/pages/impressum.md`: Viable but offers less
  layout control than a React component.

## R5: Mobile Section Layout Changes

**Decision**: Override section background styles at the <=996px
breakpoint to set `background: white` and remove background images.
For sections using background images via CSS (DescriptionSection,
KeyBenefits, DataMeshSection), add mobile-specific overrides. Images
already appear before text on mobile in ListSection (via `order: -1`).

**Rationale**: The existing codebase already uses the 996px breakpoint
for mobile layouts. Most sections already stack vertically on mobile.
The main changes are: removing background colors/images and ensuring
image-before-text ordering in DataMeshSection.

**Key findings from code analysis**:
- `DescriptionSection`: Has `background-color: rgba(214,229,228,0.39)`
  — needs override to white on mobile.
- `KeyBenefits`: Has gradient pseudo-element background — needs
  override on mobile.
- `DataMeshSection`: On mobile, image becomes absolute-positioned
  background with overlay — needs restructuring to show image as
  inline content before text.
- `ListSection`: Already shows images before text on mobile via
  `order: -1` — no change needed.
- `SetupSection`: Has gradient background — needs override to white.
- `FAQSection`: Already white background — no change needed.
- `DuckDBSection`: Has `#f8fafc` background — needs override to white.

## R6: Video Fallback Strategy

**Decision**: Set a poster image on the `<video>` element using the
mobile background image. If video fails to load, the poster image
is displayed. Additionally, the hero section will have a CSS
background-image fallback.

**Rationale**: The `poster` attribute provides a native fallback
that appears before the video loads and if it fails. Combined with
a CSS background-image on the container, this provides defense in
depth.
