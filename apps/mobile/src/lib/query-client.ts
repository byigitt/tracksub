// Re-export shared factory; `app/_layout.tsx` calls `createQueryClient()` to
// instantiate per-app (so `useState(() => createQueryClient())` keeps a stable
// instance per render tree).
export { createQueryClient } from '@tracksub/query';
