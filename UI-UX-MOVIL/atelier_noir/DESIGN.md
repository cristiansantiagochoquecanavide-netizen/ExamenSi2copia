---
name: Atelier Noir
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#cfc4c5'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#988e90'
  outline-variant: '#4c4546'
  surface-tint: '#c6c6c6'
  primary: '#c6c6c6'
  on-primary: '#303030'
  primary-container: '#000000'
  on-primary-container: '#757575'
  inverse-primary: '#5e5e5e'
  secondary: '#e7c35a'
  on-secondary: '#3d2f00'
  secondary-container: '#896c00'
  on-secondary-container: '#fff3dc'
  tertiary: '#c6c6c7'
  on-tertiary: '#2f3131'
  tertiary-container: '#000000'
  on-tertiary-container: '#747576'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#ffe08b'
  secondary-fixed-dim: '#e7c35a'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '300'
    lineHeight: 80px
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Inter
    fontSize: 56px
    fontWeight: '300'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '300'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '300'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.15em
spacing:
  layout-margin-desktop: 64px
  layout-margin-tablet: 32px
  layout-margin-mobile: 16px
  grid-gutter: 24px
  space-2xs: 4px
  space-xs: 8px
  space-sm: 16px
  space-md: 24px
  space-lg: 48px
  space-xl: 96px
  space-2xl: 128px
---

## Brand & Style

This design system channels high-end editorial fashion through a minimalist, pure black dark mode aesthetic. The emotional response is one of exclusivity, uncompromising quality, and quiet luxury. 

The visual framework is built on absolute restraint: expansive negative space, razor-sharp typography, and near-monochromatic contrast punctuated only by warm, restrained gold and stark white. By stripping away extraneous UI chrome, the product lets the imagery and typography command total attention.

## Colors

The palette is anchored by a pure black (`#000000`) canvas that allows high-resolution editorial photography to dissolve into the background. Surface containers and cards utilize a near-black charcoal (`#121212`) for subtle dimensional separation without breaking the immersive dark mode experience.

Typography relies on a stark contrast hierarchy: primary text is rendered in pure white (`#FFFFFF`) for razor-sharp legibility, while secondary metadata and captions utilize a muted stone gray (`#A0A0A0`). The accent color is a restrained antique gold (`#E5C158`), deployed selectively for high-value interactive states, active filters, and signature CTAs.

## Typography

Typography acts as the primary voice of the brand. Using Inter exclusively across all weights, the system juxtaposes ultra-light, oversized display headings against rigorously tracked, lowercase-adjacent metadata and uppercase category labels. 

Line heights are generous to enhance legibility and convey a sense of unhurried elegance. On mobile viewports, display sizes scale down proportionately (e.g., `display-xl` shifts to 40px) to prevent awkward wrapping and maintain editorial composure on compact screens.

## Layout & Spacing

The layout is built on a fluid 12-column grid that expands gracefully across ultra-wide desktop monitors while enforcing strict vertical rhythm. Generous outer margins (64px on desktop) frame the content like a gallery exhibition.

Spacing tokens follow a generous scale designed to let elements breathe. Dense UI arrangements are strictly prohibited; whitespace is treated as a primary design material that communicates luxury and exclusivity. On mobile, margins collapse to 16px while maintaining generous vertical gaps between editorial modules.

## Elevation & Depth

Depth is conveyed almost entirely through tonal layering rather than drop shadows. By stacking near-black surfaces (`#121212`) over the pure black background (`#000000`), UI elements emerge through subtle shifts in luminance.

When separation requires greater definition, utilize low-contrast outlines—hairline borders in 10% opacity white (`rgba(255, 255, 255, 0.1)`)—rather than heavy strokes. Shadows are entirely avoided to maintain a completely flat, ultra-modern graphic purity reminiscent of high-fashion print layouts.

## Shapes

The shape language is strictly sharp (`0` roundedness, 0px border radius). All containers, buttons, image frames, and input fields feature precise 90-degree corners. This uncompromising geometric precision reinforces the architectural, haute couture sensibility of the brand and contrasts sharply against the organic forms of draped fabrics and human photography.

## Components

### Buttons
Primary action buttons feature a stark white (`#FFFFFF`) background with pure black (`#000000`) typography, shifting to the antique gold accent (`#E5C158`) on hover. Secondary buttons utilize a transparent background with a 1px solid white outline. All buttons are strictly rectangular (0px radius) with generous horizontal padding.

### Input Fields
Inputs consist of a minimal bottom border in muted gray (`#A0A0A0`) against the `#121212` surface, transitioning to pure white on focus. Labels float or sit statically above the input in uppercase tracked lettering (`label-caps`).

### Cards
Product cards feature edge-to-edge photography with zero padding. Typography (product name, price) sits cleanly below the image with left alignment and generous line spacing. Hover states subtly scale the image by 1.03x with an ultra-smooth transition.

### Chips & Tags
Used for sizing, color variants, and filters. Rendered as 1px outlined rectangles that fill with solid white or gold when selected, inverting the text color for maximum contrast.

### Lists & Navigation
Navigation is minimal, pinned, and ultra-clean, featuring horizontal category links with subtle underline indicators on active states. Accordion lists for product details (materials, care, shipping) use clean 1px dividers.