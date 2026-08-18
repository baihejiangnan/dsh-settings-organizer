import z from "schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";

const NAMESPACE = "dsh-settings-organizer";
const ROUTE = "/settings-organizer/api/config";
const Preferences = z.object({ configJson: z.string().default("") });

function isSameOrigin(req) {
  if (req.headers?.["sec-fetch-site"] === "cross-site") return false;
  const host = req.headers?.host;
  const origin = req.headers?.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function sendJson(res, status, value) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 256 * 1024) {
        reject(new Error("config payload is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("config payload is invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function validConfig(value) {
  return Boolean(
    value &&
      value.version === 2 &&
      Array.isArray(value.nodes) &&
      value.assignments &&
      typeof value.assignments === "object" &&
      !Array.isArray(value.assignments),
  );
}

function storedConfig(scope) {
  try {
    const value = JSON.parse(scope.get().configJson || "null");
    return validConfig(value) ? value : null;
  } catch {
    return null;
  }
}

export function apply(ctx) {
  ctx.inject(["settings", "webServer"], (serviceCtx) => {
    const scope = serviceCtx.settings.register(
      settingsNamespace(NAMESPACE),
      Preferences,
    );
    serviceCtx.effect(() =>
      serviceCtx.webServer.register({
        name: "dsh-settings-organizer-config",
        kind: "exact",
        path: ROUTE,
        handler: async (req, res) => {
          if (!isSameOrigin(req)) {
            sendJson(res, 403, { error: "forbidden" });
            return;
          }
          const method = String(req.method || "GET").toUpperCase();
          if (method === "GET") {
            sendJson(res, 200, { config: storedConfig(scope) });
            return;
          }
          if (method !== "POST") {
            res.writeHead(405).end();
            return;
          }
          try {
            const body = await readJson(req);
            if (!validConfig(body?.config)) throw new Error("config is invalid");
            await scope.update({ configJson: JSON.stringify(body.config) });
            sendJson(res, 200, { config: storedConfig(scope) });
          } catch (error) {
            sendJson(res, 400, { error: String(error?.message || error) });
          }
        },
      }),
    );
  });
}
