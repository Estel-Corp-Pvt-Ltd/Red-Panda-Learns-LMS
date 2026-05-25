# Project Conventions

## Typography

- The entire website should use the Figtree font.
- Use Tailwind's `font-sans` utility for normal website text; it maps to Figtree in `tailwind.config.ts`.
- Do not introduce another primary UI font unless a specific branded or decorative exception is approved.

## Documentation

- Documentation file names should use `SNAKE_CASE`, such as `ISSUE_TRACKER.md`.

## UI Components

- Use the shared standard modal component for modal-worthy feedback, confirmations, and blocking messages instead of creating one-off modal implementations or persistent inline alerts.
