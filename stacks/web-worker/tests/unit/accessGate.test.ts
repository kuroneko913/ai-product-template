import { beforeAll, describe, expect, it } from "vitest";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTVerifyGetKey,
} from "jose";
import { accessConfigured, verifyAccessToken } from "../../worker/accessGate";

const config = {
  ACCESS_TEAM_DOMAIN: "https://synthetic-team.cloudflareaccess.com",
  ACCESS_AUD: "a".repeat(64),
  ACCESS_ALLOWED_EMAIL: "owner@example.test",
};
let keys: JWTVerifyGetKey, signing: CryptoKey, other: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  signing = pair.privateKey;
  other = (await generateKeyPair("RS256")).privateKey;
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: "fixture", alg: "RS256" }],
  });
});

async function token(changes: Record<string, unknown> = {}, key = signing) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: config.ACCESS_TEAM_DOMAIN,
    aud: config.ACCESS_AUD,
    sub: "synthetic-user",
    email: config.ACCESS_ALLOWED_EMAIL,
    type: "app",
    iat: now,
    exp: now + 300,
    ...changes,
  })
    .setProtectedHeader({ alg: "RS256", kid: "fixture" })
    .sign(key);
}

describe("Access JWT の検証", () => {
  it("正しいトークンは通る", async () => {
    expect(accessConfigured(config)).toBe(true);
    await expect(verifyAccessToken(await token(), config, keys)).resolves.toBeUndefined();
  });

  it("設定が足りない、または安全でないときは使えない", () => {
    for (const c of [
      {},
      { ...config, ACCESS_AUD: "" },
      { ...config, ACCESS_TEAM_DOMAIN: "http://synthetic-team.cloudflareaccess.com" },
      { ...config, ACCESS_TEAM_DOMAIN: "https://attacker.test" },
      { ...config, ACCESS_TEAM_DOMAIN: config.ACCESS_TEAM_DOMAIN + "/path" },
      { ...config, ACCESS_ALLOWED_EMAIL: "" },
    ])
      expect(accessConfigured(c)).toBe(false);
  });

  it("別の署名、issuer、audience、利用者、サービストークン、時刻の不正は拒否する", async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const c of [
      { iss: "https://other.cloudflareaccess.com" },
      { aud: "b".repeat(64) },
      { email: "other@example.test" },
      { type: "service" },
      { exp: now - 10 },
      { iat: now + 100 },
      { nbf: now + 100 },
      { exp: undefined },
      { sub: undefined },
    ])
      await expect(verifyAccessToken(await token(c), config, keys)).rejects.toThrow();
    await expect(verifyAccessToken(await token({}, other), config, keys)).rejects.toThrow();
  });

  it("壊れた・大きすぎるトークンと、空の設定は拒否する", async () => {
    for (const t of ["", "garbage", "x".repeat(17000)])
      await expect(verifyAccessToken(t, config, keys)).rejects.toThrow();
    await expect(verifyAccessToken(await token(), {}, keys)).rejects.toThrow();
  });
});
