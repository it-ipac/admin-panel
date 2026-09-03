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

Tailwind `dark:` variants must follow the same rule. Components must not implement a second interpretation of dark mode.

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

Use the named status/brand scales (`primary`, `success`, `warning`, `danger`, etc.) for intentional accents.

Do not add global selectors that force colors onto every `div`, `span`, SVG, heading, or border. Base text should inherit from `body`; component utilities should remain free to override it.

## Tailwind

Prefer Tailwind utilities in components for layout, spacing, typography, colors, responsive behavior, states, and ordinary shadows/borders.

Avoid adding CSS classes that simply reproduce a Tailwind utility bundle. If a pattern repeats, extract a React component or a shared class constant first.

## DaisyUI

DaisyUI is a supporting component layer, not the theme source of truth. Use it selectively where its behavior/structure materially reduces code. Before adopting a DaisyUI component broadly, ensure its colors resolve through IPAC semantic tokens rather than introducing independent Daisy theme colors.

## Legacy CSS

Existing portal CSS files are being reduced incrementally. Do not add new one-off portal CSS files for individual icons, buttons, or theme bugs. Fix the token/cascade issue or style the owning component with Tailwind.
