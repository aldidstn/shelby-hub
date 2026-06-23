# ADR 0003: CSS Modules without Tailwind

Tailwind and its PostCSS plugin were removed. The utility rules required by unchanged legacy JSX were compiled once into `src/styles/legacy-utilities.css`, making the compatibility layer deterministic and build-tool independent. Design tokens live in `src/styles/tokens.css`; new or modified component styles must use CSS Modules. As components are migrated, unused compatibility selectors can be deleted without reintroducing Tailwind.
