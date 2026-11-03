// 例: 「本人だけが、アプリの稼働状況を確認できる」(テンプレートの初期の受け入れ条件)
import { describe, expect, it, vi } from "vitest";
import { createHandler, type Env } from "../../worker/index";

const origin = "https://product.example.test";
const env: Env = {
  APP_ORIGIN: origin,
  ACCESS_TEAM_DOMAIN: "https://synthetic-team.cloudflareaccess.com",
  ACCESS_AUD: "a".repeat(64),
  ACCESS_ALLOWED_EMAIL: "owner@example.test",
  ASSETS: { fetch: vi.fn(async () => new Response("asset")) },
};
const request = () =>
  new Request(origin + "/api/health", { headers: { "Cf-Access-Jwt-Assertion": "t" } });

describe("稼働状況の確認", () => {
  it("本人は ok を受け取れる", async () => {
    const res = await createHandler(env, async () => undefined)(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("本人でなければ、何も受け取れない", async () => {
    const res = await createHandler(env, async () => {
      throw new Error("not the owner");
    })(request());
    expect(res.status).toBe(403);
  });
});
