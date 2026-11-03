import { describe, expect, it, vi } from "vitest";
import { createHandler, type Env } from "../../worker/index";

const origin = "https://product.example.test";
const base = {
  APP_ORIGIN: origin,
  ACCESS_TEAM_DOMAIN: "https://synthetic-team.cloudflareaccess.com",
  ACCESS_AUD: "a".repeat(64),
  ACCESS_ALLOWED_EMAIL: "owner@example.test",
};

function env(overrides: Partial<Env> = {}, assets = vi.fn()): Env {
  assets.mockImplementation(async () => new Response("asset"));
  return { ...base, ASSETS: { fetch: assets }, ...overrides };
}
const allow = async () => undefined;
const deny = async () => {
  throw new Error("invalid");
};
const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(origin + path, {
    headers: { "Cf-Access-Jwt-Assertion": "token", ...headers },
  });

describe("本人限定のゲート", () => {
  it("設定が不完全なら、閉じる(503)", async () => {
    for (const e of [
      env({ ACCESS_AUD: "" }),
      env({ ACCESS_ALLOWED_EMAIL: "" }),
      env({ APP_ORIGIN: "https://REPLACE_WITH_APPROVED_HOST" }),
      env({ APP_ORIGIN: "http://product.example.test" }),
    ]) {
      const res = await createHandler(e, allow)(get("/"));
      expect(res.status).toBe(503);
    }
  });

  it("トークンがない、または検証に失敗したら403", async () => {
    const noToken = new Request(origin + "/");
    expect((await createHandler(env(), allow)(noToken)).status).toBe(403);
    expect((await createHandler(env(), deny)(get("/"))).status).toBe(403);
  });

  it("別のオリジン宛てなら403", async () => {
    const other = new Request("https://other.example.test/", {
      headers: { "Cf-Access-Jwt-Assertion": "token" },
    });
    expect((await createHandler(env(), allow)(other)).status).toBe(403);
  });

  it("検証に通ると静的ファイルを返し、認証情報はアセット側へ渡さない", async () => {
    const assets = vi.fn();
    const res = await createHandler(env({}, assets), allow)(
      get("/", { Cookie: "CF_Authorization=x", Authorization: "Bearer y" }),
    );
    expect(res.status).toBe(200);
    const forwarded = assets.mock.calls[0][0] as Request;
    expect(forwarded.headers.has("Cookie")).toBe(false);
    expect(forwarded.headers.has("Authorization")).toBe(false);
    expect(forwarded.headers.has("Cf-Access-Jwt-Assertion")).toBe(false);
  });

  it("セキュリティヘッダーを付ける", async () => {
    const res = await createHandler(env(), allow)(get("/"));
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("静的ファイルへのGET/HEAD以外は405", async () => {
    const post = new Request(origin + "/", {
      method: "POST",
      headers: { "Cf-Access-Jwt-Assertion": "token" },
    });
    expect((await createHandler(env(), allow)(post)).status).toBe(405);
  });
});

describe("API", () => {
  it("/api/health は本人にだけ ok を返す", async () => {
    const res = await createHandler(env(), allow)(get("/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect((await createHandler(env(), deny)(get("/api/health"))).status).toBe(403);
  });

  it("定義のないAPIは404", async () => {
    expect((await createHandler(env(), allow)(get("/api/unknown"))).status).toBe(404);
  });
});
