# Shelby Research design direction

Shelby Research is an editorial glass workspace, not a generic crypto dashboard. Dark mode uses a dynamic pink atmosphere behind restrained translucent surfaces; light mode uses a clean white canvas. Both themes keep dense on-chain information calm and readable.

## Rules

- Use the two-region application shell: persistent navigation on the left and one unified content workspace on the right. Search belongs in the workspace toolbar, never in a separate top navbar.
- Preserve the pink ambient palette and paired light/dark semantic tokens in `src/styles/tokens.css`.
- Use Outfit for display headings; Geist is the reading face and Geist Mono is reserved for hashes and addresses.
- Reserve strong glass treatment for the sidebar, workspace, and dialogs. Use subtle translucent cards inside them to preserve hierarchy.
- Keep motion short and purposeful and always respect reduced-motion preferences.
- All controls require visible focus states, readable labels, and 40px minimum touch targets.
- Component-specific styling belongs in a colocated CSS Module. Global CSS contains only tokens, resets, typography, and shared motion primitives.
- Tailwind is not part of the toolchain. Existing utility selectors are frozen in `src/styles/legacy-utilities.css` for parity; never add selectors there. Migrate touched components to CSS Modules.
