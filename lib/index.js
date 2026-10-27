/**
 * dsh-archived-manager — plugin entry.
 *
 * Mounts the exact HTTP routes only once the host exposes its web server. All
 * policy lives in ./host.js; this file is the Cordis wiring.
 */
import { createRoutes } from './host.js';

/** Cordis plugin name (also the client bundle id). */
export const name = 'archived-manager';

/**
 * Register the plugin routes.
 * @param ctx - host Cordis context.
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    host.effect(() => {
      const disposers = createRoutes(ctx).map((route) => host.webServer.register(route));
      return () => {
        for (const dispose of disposers) {
          try {
            dispose();
          } catch {
            /* already disposed */
          }
        }
      };
    }, 'archived-manager: http routes');
  });
}
