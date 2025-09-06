# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Performance &amp; Best Practices Checklist

This project follows several key principles to ensure a robust and performant Next.js application.

### Configuration & Build
- **Tailwind CSS Scope**: Content scanning is narrowed to `src/**/*.{ts,tsx,mdx}` for faster builds.
- **Service Worker**: The service worker is disabled by default (`NEXT_PUBLIC_ENABLE_SW=0`) and only registers when explicitly enabled, keeping it out of the critical path during development.
- **Transpilation**: The `next.config.ts` correctly transpiles local workspace packages.
- **Type Checking**: TypeScript type checks are run as a separate process (`pnpm typecheck`) and are not tied to the development server, ensuring faster startup times.
- **Module Singletons**: Utilities like `Day.js` are imported from a single, shared initializer to avoid duplicate code in the bundle.

### Component Architecture
- **SSR/CSR Harmony**: Client-only APIs (like `new Date()`, `Math.random()`, `window`, `navigator`) are exclusively used within `useEffect` hooks to prevent server-client hydration mismatches.
- **Static Layout**: The root layout is a Server Component with a static `<head>`, ensuring a stable HTML shell. Client-side variations (like theme changes) are applied after hydration.
- **Client Components**: All interactive UI primitives (e.g., ShadCN components) and pages requiring client-side state or effects correctly use the `'use client'` directive.
- **Lazy Loading**: Heavy components, like `recharts`, are lazy-loaded with SSR disabled (`ssr: false`) to reduce the initial client bundle size.
- **Debouncing**: Intensive computations in client components are debounced and deferred to run after the main render thread is free.

By following these patterns, the application avoids common hydration errors, ensures that client-only features like toasts and tabs work correctly, and keeps performance-intensive tasks out of the critical startup path.