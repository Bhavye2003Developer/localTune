<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

You must use test driven development.

Every feature must work on both mobile (< 640px, touch) and desktop. Sidebars/panels become full-screen overlays on mobile. Touch targets must be ≥ 44px. Never hide critical UI with `hidden sm:block` unless an equally usable mobile alternative exists. Use `env(safe-area-inset-bottom)` for fixed bottom bars on iOS.

<!-- END:nextjs-agent-rules -->
