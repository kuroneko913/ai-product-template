/**
 * アプリのAPI。ここに足すものは、すべて本人確認(Access)を通ったあとに呼ばれる。
 * キーは "メソッド パス"。一致しないものは404になる。
 */
export type Route = (request: Request) => Response | Promise<Response>;

export const routes: Record<string, Route> = {
  "GET /api/health": () => Response.json({ ok: true }),
};
