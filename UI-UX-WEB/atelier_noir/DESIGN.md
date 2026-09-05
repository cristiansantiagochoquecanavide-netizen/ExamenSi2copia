---
name: Atelier Noir
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  headline-xl:
    fontFamily: Bodoni Moda
    fontSize: 56px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Bodoni Moda
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '300'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '300'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.08em
spacing:
  grid-margin: 4rem
  grid-gutter: 2rem
  space-3xs: 0.25rem
  space-2xs: 0.5rem
  space-xs: 1rem
  space-sm: 1.5rem
  space-md: 2rem
  space-lg: 4rem
  space-xl: 8rem
  space-2xl: 12rem
---

## Brand & Style

This design system establishes a high-end editorial fashion e-commerce and administrative environment. The brand personality is uncompromisingly luxurious, exclusive, and precise. The target audience comprises discerning luxury consumers, high-fashion curators, and meticulous atelier operators. 

The UI evokes an emotional response of awe, exclusivity, and calm authority—reminiscent of walking through a physical flagship boutique in Paris or Milan. 

We embrace a **Minimalism / High-Contrast** hybrid style, characterized by razor-sharp geometry, absolute blacks, expansive negative space, and typographic dominance. Ornate decorative elements are stripped away to let the editorial imagery and structure speak entirely for themselves.

## Colors

The color palette is strictly restrained to anchor the high-fashion aesthetic. The foundation is built upon pure black (`#000000`) and sophisticated charcoal surfaces (`#111111`, `#1a1a1a`) to ensure merchandise imagery pops with absolute fidelity. 

- **Primary:** Crisp White (`#FFFFFF`) for primary headings, active states, and maximum legibility.
- **Secondary:** Warm Editorial Gold (`#d4af37`) applied sparingly for focal accents, luxury badges, and primary call-to-action highlights.
- **Tertiary:** Charcoal Depth (`#1a1a1a`) for card backgrounds, dividers, and structural containers.
- **Neutral:** Pure Black (`#000000`) for canvas backgrounds.

## Typography

Typography acts as the primary ornamental element. We pair a high-contrast, elegant editorial serif (`Bodoni Moda`) for all headlines with a clean, ultra-refined sans-serif (`Inter`) for body copy, data tables, and interface labels. 

- **Headlines:** Use generous tracking adjustments and elegant font weights to mirror high-fashion print layouts. Scale down headline sizes gracefully on mobile viewports to prevent awkward wrapping.
- **Labels:** Always uppercase with wide letter-spacing (`0.08em`) to evoke classic luxury branding.

## Layout & Spacing

The layout philosophy relies on a **Fluid grid** with expansive, rhythmic whitespace that emulates luxury gallery spaces. 

- **Grid System:** 12-column fluid grid utilizing generous 2rem gutters and a minimum 4rem outer margin on desktop, compressing to 1.5rem on mobile.
- **Spacing Rhythm:** Vertical rhythm is strictly enforced using multiples of the baseline grid, favoring oversized spacing steps (`space-lg`, `space-xl`) to separate major editorial content blocks and product showcases. Admin dashboards utilize tighter, highly structured spacing (`space-2xs` to `space-sm`) to optimize data density without sacrificing clarity.

## Elevation & Depth

Depth is achieved entirely through **Low-contrast outlines and tonal layering** rather than traditional drop shadows. 

- **Surfaces:** Stacked containers step up in lightness, moving from pure black (`#000000`) canvas to deep charcoal (`#111111`) and structured gray (`#1a1a1a`).
- **Borders:** Razor-sharp 1px borders using precise alpha-blended white (`rgba(255, 255, 255, 0.15)`) define containers, product cards, and table rows. No ambient shadows or blurs are permitted, preserving the stark, graphic purity of high-end print editorial design.

## Shapes

The design system enforces a **Sharp (`0`)** shape language. All UI elements—including buttons, cards, input fields, image containers, and modals—feature absolute 0px roundedness with right-angle corners. This uncompromising architectural sharpness communicates precision, couture tailoring, and editorial authority.

## Components

### Buttons
- **Primary:** Solid crisp white background (`#FFFFFF`) with stark black text. On hover, invert to transparent with a 1px solid white border. Height is generous (48px for e-commerce, 40px for admin). Zero border-radius.
- **Secondary / Ghost:** Transparent background with a 1px solid white or subtle charcoal border. Hover states fill with `#1a1a1a`.

### Input Fields
- Razor-sharp 1px borders in charcoal gray, transitioning to pure white on focus. Backgrounds are solid `#111111` with inset padding. Placeholder text uses muted gray (`#666666`) in `Inter` body-md.

### Cards
- Product and editorial cards feature edge-to-edge imagery with zero rounded corners, resting on `#000000` or `#111111` surfaces. Typography sits cleanly below the image with generous vertical tracking.

### Chips & Tags
- Uppercase `label-md` style enclosed in a 1px solid border. Used for size selectors, category filters, and inventory status tags. Active states invert to white background with black text.

### Checkboxes & Radio Buttons
- Custom-rendered sharp 16x16px squares and crisp geometric markers. Unchecked states show a 1px white border on a black fill; checked states fill solidly with white featuring a micro-inset black indicator.

### Lists & Data Tables (Admin)
- High-density tabular layouts with hairline horizontal dividers (`rgba(255,255,255,0.08)`). Row hover states shift background tint to `#1a1a1a`. Numerical data is right-aligned using tabular figures.

### Additional Components
- **Image Lookbooks:** Immersive full-bleed grids with subtle, delayed hover zoom effects and floating typographic captions.
- **Inventory Matrix:** Specialized admin component displaying real-time stock levels across global atelier locations with status indicators (Gold for low stock, White for optimal).