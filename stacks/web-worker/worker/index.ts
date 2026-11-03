import {
  accessConfigured,
  verifyAccessToken,
  type AccessConfig,
} from "./accessGate";
import { routes } from "./api";

export interface Env extends AccessConfig {
  APP_ORIGIN: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type Verify = (token: string, config: AccessConfig) => Promise<void>;

const securityHeaders: Record<string, string> = {
  "Cache-Control": "no-store, private",
  Vary: "Cf-Access-Jwt-Assertion, Cookie",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function validOrigin(env: Env): string | null {
  try {
    const url = new URL(env.APP_ORIGIN);
    if (
      url.origin !== env.APP_ORIGIN ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /REPLACE_WITH/i.test(url.host)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * 本人限定のゲート付きハンドラ。設定が不完全なときは、必ず閉じる(503)。
 * 公開へ切り替える仕組みは、このテンプレートにはまだない(docs/RELEASE.md)。
 */
export function createHandler(env: Env, verify: Verify = verifyAccessToken) {
  return async (request: Request): Promise<Response> => {
    const reply = (
      status: number,
      message: string,
      extra: Record<string, string> = {},
    ) =>
      new Response(request.method === "HEAD" ? null : message, {
        status,
        headers: { ...securityHeaders, ...extra },
      });

    const origin = validOrigin(env);
    if (!origin || !accessConfigured(env)) return reply(503, "Unavailable");

    const url = new URL(request.url);
    if (
      url.origin !== origin ||
      (request.headers.has("Host") &&
        request.headers.get("Host")?.toLowerCase() !== url.host.toLowerCase())
    )
      return reply(403, "Forbidden");

    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token || token.length > 16384) return reply(403, "Forbidden");
    try {
      await verify(token, env);
    } catch {
      return reply(403, "Forbidden");
    }

    if (url.pathname.startsWith("/api/")) {
      const route = routes[`${request.method} ${url.pathname}`];
      if (!route) return reply(404, "Not found");
      try {
        const response = await route(request);
        const headers = new Headers(response.headers);
        for (const [key, value] of Object.entries(securityHeaders))
          headers.set(key, value);
        return new Response(response.body, { status: response.status, headers });
      } catch {
        // 例外の中身(本文・鍵・スタック)は返さない、ログにも出さない。
        return reply(500, "Internal error");
      }
    }

    if (!["GET", "HEAD"].includes(request.method))
      return reply(405, "Method not allowed", { Allow: "GET, HEAD" });

    try {
      const assetHeaders = new Headers(request.headers);
      assetHeaders.delete("Authorization");
      assetHeaders.delete("Cookie");
      assetHeaders.delete("Cf-Access-Jwt-Assertion");
      const asset = await env.ASSETS.fetch(
        new Request(url, { method: request.method, headers: assetHeaders }),
      );
      const headers = new Headers(asset.headers);
      for (const [key, value] of Object.entries(securityHeaders))
        headers.set(key, value);
      return new Response(request.method === "HEAD" ? null : asset.body, {
        status: asset.status,
        headers,
      });
    } catch {
      return reply(503, "Unavailable");
    }
  };
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createHandler(env)(request);
  },
};
