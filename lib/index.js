/**
 * dsh-archived-manager — plugin entry.
 *
 * Scope routes and their observers to the injected Cordis web server.
 * The updater owns its independent control route across a plugin reload.
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
    const routes = createRoutes(host, { webServer: host.webServer });
    host.effect(() => {
      const disposers = [];
      function disposeRoutes() {
        for (const dispose of disposers.splice(0).reverse()) {
          try { dispose(); } catch { /* already disposed */ }
        }
      }
      try {
        for (const route of routes) disposers.push(host.webServer.register(route));
      } catch (error) {
        disposeRoutes();
        throw error;
      }
      return disposeRoutes;
    }, 'archived-manager: http routes');
  });
}
