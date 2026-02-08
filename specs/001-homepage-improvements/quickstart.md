# Verification Guide: Website Starter Page Improvements

## Prerequisites

- Node.js and Yarn installed
- Repository checked out on `001-homepage-improvements` branch

## Steps

### 1. Start the dev server

```bash
yarn start
```

Open http://localhost:3000/ in a browser.

### 2. Verify Hero Video (Desktop)

- Ensure browser window is wider than 996px.
- Confirm the hero section plays a looping video background.
- Confirm no audio is produced.
- Confirm the video covers the full hero area without
  letterboxing or stretching.
- Wait for the video to loop — confirm seamless transition.

### 3. Verify Hero Text Color (Desktop)

- Inspect the subtitle "One GraphQL layer for all your data."
- Confirm the text color is `#056969`.

### 4. Verify Mobile Hero Image

- Resize browser to 375px wide (or use DevTools mobile view).
- Confirm the hero section shows a static background image
  (no video playing).
- Confirm the image covers the full hero area.

### 5. Verify Mobile Section Backgrounds

- Still in mobile viewport (<=996px), scroll through all sections:
  - Description section: white background, no tinted overlay.
  - Key Benefits: white background, no gradient.
  - Data Mesh: white background, image shown before text as
    inline content (not as background overlay).
  - Use Cases: images appear before text content.
  - Setup section: white background.
  - FAQ section: white background.
  - DuckDB section: white background.

### 6. Verify Desktop Layout Unchanged

- Resize browser back to desktop width (>996px).
- Confirm all sections below the hero retain their original
  background colors and layout (no white override).

### 7. Verify Impressum Page

- Scroll to footer on any page.
- Click the "Impressum" link.
- Confirm the page displays:
  - Name: Vladimir Gribanov
  - Address: Filderstr. 54, 70771 Leinfelden-Echterdingen, Germany
  - Email: vladimir.gribanov@gmail.com
- Confirm the page uses the site's Quicksand font and layout.

### 8. Build Validation

```bash
yarn build
```

Confirm zero errors and zero broken link warnings.
