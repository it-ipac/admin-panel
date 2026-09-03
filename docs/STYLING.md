# Styling Architecture

## Goal

Use one predictable styling stack:

```text
data-theme / system preference
        ↓
semantic CSS tokens
        ↓
Tailwind utilities
        ↓
React components
```

Tailwind is the primary styling API. CSS files are reserved for shared tokens, true base styles, and effects that are awkward or impossible to express clearly as utilities.

## Theme ownership

`data-theme="light"` and `data-theme="dark"` are the explicit theme source of truth. When no `data-theme` is present, the operating-system preference is the system fallback.

Tailwind's `dark:` variant is customized in `styles.css` to follow exactly that rule. Components must not implement a second interpretation of dark mode.

## Tokens

Use semantic app tokens for surfaces and text:

```text
bg-app-bg
bg-app-surface
bg-app-surface-muted
border-app-border
border-app-border-muted
text-app-text
text-app-text-muted
text-app-text-subtle
text-app-text-strong
```

Light/dark values are paired once in the runtime semantic variables in `styles.css`. Components consume the semantic Tailwind utilities rather than repeating `light-dark()` values.

Use the named status/brand scales (`primary`, `success`, `warning`, `danger`, etc.) for intentional accents.

Do not add global selectors that force colors onto every `div`, `span`, SVG, heading, table cell, or border. Base text should inherit from `body`; component utilities must remain free to override it.

## Tailwind

Prefer Tailwind utilities in components for layout, spacing, typography, colors, responsive behavior, states, and ordinary shadows/borders.

Avoid adding CSS classes that simply reproduce a Tailwind utility bundle. If a pattern repeats, extract a React component or a shared class constant first.

Portal header and lookup responsiveness are component-owned Tailwind styles; do not recreate them with `:has()`, element-shape selectors, or `!important` patches.

## DaisyUI

DaisyUI is a supporting component layer, not the theme source of truth.

Built-in DaisyUI themes are disabled. Daisy's `base`, `primary`, status, radius, and field variables are mapped to the same IPAC semantic tokens used by Tailwind. This makes Daisy components safe to adopt selectively without introducing a separate light/dark palette.

Use DaisyUI where its component behavior or structure materially reduces code (for example generic controls or simple state primitives). Keep custom portal/product surfaces in Tailwind when Daisy would require extensive overrides.

## Legacy CSS

Do not add one-off portal CSS files for individual icons, buttons, scanners, or theme bugs. Fix the token/cascade issue or style the owning component with Tailwind.

The remaining CSS outside `styles.css` should have a specific reason to exist, such as a complex decorative effect that is clearer in CSS than as a long utility string. Transitional compatibility files should be removed as their owning components are migrated.
