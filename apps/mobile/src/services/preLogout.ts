/**
 * Pre-logout handler registry. Subsystems that hold server-side state
 * needing finalization with the CURRENT credentials (e.g. an active
 * tracking session) register here; AuthContext.logout runs every handler
 * BEFORE clearing tokens, so handlers get one last authenticated window.
 *
 * A plain module registry (not React context) because AuthProvider sits
 * ABOVE the registering providers in the tree and can't consume their
 * contexts.
 */
type PreLogoutHandler = () => Promise<void>;

const handlers = new Set<PreLogoutHandler>();

export function registerPreLogoutHandler(fn: PreLogoutHandler): () => void {
  handlers.add(fn);
  return () => {
    handlers.delete(fn);
  };
}

/**
 * Run all handlers, isolating failures — logout must never be blocked by
 * a handler error (the user asked to leave; honor it). Each handler is
 * raced against a timeout so an offline network call can't hang logout.
 */
export async function runPreLogoutHandlers(timeoutMs = 5000): Promise<void> {
  await Promise.all(
    [...handlers].map((fn) => {
      // Per-handler timeout — a shared one would let the first slow
      // handler cancel the budget for every other handler.
      const timeout = new Promise<void>((resolve) => {
        setTimeout(resolve, timeoutMs);
      });
      return Promise.race([
        fn().catch((e) => {
          // eslint-disable-next-line no-console
          console.warn('[preLogout] handler failed:', e);
        }),
        timeout,
      ]);
    }),
  );
}
