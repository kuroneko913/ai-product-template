import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
export interface AccessConfig {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ACCESS_ALLOWED_EMAIL?: string;
}
export function accessConfigured(config: AccessConfig): boolean {
  let team = "";
  try {
    const url = new URL(config.ACCESS_TEAM_DOMAIN ?? "");
    if (
      url.origin !== config.ACCESS_TEAM_DOMAIN ||
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".cloudflareaccess.com")
    )
      return false;
    team = url.hostname.slice(0, -".cloudflareaccess.com".length);
  } catch {
    return false;
  }
  return (
    /^[a-z0-9-]{1,63}$/.test(team) &&
    !team.startsWith("-") &&
    !team.endsWith("-") &&
    typeof config.ACCESS_AUD === "string" &&
    /^[a-f0-9]{64}$/.test(config.ACCESS_AUD) &&
    typeof config.ACCESS_ALLOWED_EMAIL === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.ACCESS_ALLOWED_EMAIL) &&
    config.ACCESS_ALLOWED_EMAIL.length <= 254
  );
}
let cached: { issuer: string; keys: JWTVerifyGetKey } | undefined;
export async function verifyAccessToken(
  token: string,
  config: AccessConfig,
  keys?: JWTVerifyGetKey,
): Promise<void> {
  if (!accessConfigured(config) || !token || token.length > 16384)
    throw new Error("invalid-access");
  const issuer = config.ACCESS_TEAM_DOMAIN!;
  if (!keys) {
    if (!cached || cached.issuer !== issuer)
      cached = {
        issuer,
        keys: createRemoteJWKSet(new URL(issuer + "/cdn-cgi/access/certs"), {
          timeoutDuration: 5000,
        }),
      };
    keys = cached.keys;
  }
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"],
    issuer,
    audience: config.ACCESS_AUD,
    requiredClaims: ["iss", "aud", "exp", "iat", "sub", "email", "type"],
    clockTolerance: 0,
  });
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.type !== "app" ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload.iat !== "number" ||
    payload.iat > now ||
    typeof payload.email !== "string" ||
    payload.email.toLowerCase() !== config.ACCESS_ALLOWED_EMAIL!.toLowerCase()
  )
    throw new Error("invalid-access");
}
