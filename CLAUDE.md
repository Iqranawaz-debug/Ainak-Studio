# VisualLens AI

React + Vite + Tailwind project. Run it with `npm run dev`.

## Design rules

- Light warm theme only. Never add a dark mode.
- Never use blue, in any shade.
- Colors:
  - Ivory `#FAF6F0`
  - Ink `#1C1917`
  - Coral `#E8553D`
  - Amber `#C98A2B`
- Exception: the spectacles scene (`src/components/SpectaclesScene.jsx`) also uses green and pink frames. Use them nowhere else.
- Exception: `src/frames/colors.js` lists the colors customers can pick for their glasses, including blue. Those colors appear only on the glasses and their swatches, never in the UI theme.
- Exception: the images in `public/frames/realistic/` keep their own colors. Log every new image in `public/frames/licenses.md`, and accept only CC0, public domain or CC BY images whose license you confirmed on the source page.
- Fonts: Fraunces for headings, DM Sans for body.

Colors and fonts are defined in `src/index.css`. Use their Tailwind classes, such as `bg-coral`, `text-ink`, `font-heading`.

- Style: warm luxury editorial (ivory, charcoal, coral), with subtle fashion-tech touches and no neon or glow. Elegant type hierarchy, rounded cards, subtle borders, generous spacing.

## Code rules

- Keep code simple.
- Keep code commented.
- Add no dependencies without telling the user why.

## Protected behavior

- Do not modify face detection, glasses positioning/fit, or the recommendation logic unless the user says so.
- UI work must not break the 2D and 3D modes or the webcam.

## Product rules

- Every new control must actually work. No placeholder features.
- Do not call anything AI unless real computer vision logic backs it.
- New images, fonts or models must be CC0, public domain or CC BY, logged in `public/frames/licenses.md`.
- Saved data uses localStorage for now. Say "saved on this device" in the UI.

## Reporting

- Always report what could not be verified on a real webcam, and any frame-rate drop.
