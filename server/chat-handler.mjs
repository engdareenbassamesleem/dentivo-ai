const BODY_LIMIT_BYTES = 16 * 1024;

function reply(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function parseChatInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (typeof input.message !== "string") return null;

  const message = input.message.trim();
  if (!message || message.length > 2000) return null;
  if (!Array.isArray(input.history) || input.history.length > 10) return null;

  const history = [];
  for (const item of input.history) {
    if (!item || !["user", "model"].includes(item.role) || !Array.isArray(item.parts) ||
        item.parts.length !== 1 || typeof item.parts[0]?.text !== "string") {
      return null;
    }
    const text = item.parts[0].text.trim();
    if (!text || text.length > 2000) return null;
    history.push({ role: item.role, parts: [{ text }] });
  }

  return { message, history };
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) {
      const error = new Error("Request too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON");
    error.status = 400;
    throw error;
  }
}

/**
 * Inject dependencies so API behavior can be tested without credentials or
 * network access. Firebase identity is checked on every chat request.
 */
export function createChatHandler({
  verifyIdToken,
  generateReply,
  allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"],
  maxRequests = 10,
  windowMs = 60_000,
  now = () => Date.now(),
}) {
  const usage = new Map();

  return async (req, res) => {
    if (req.url === "/api/health" && req.method === "GET") {
      return reply(res, 200, { status: "ok" });
    }

    if (req.url !== "/api/chat") return reply(res, 404, { error: "Not found" });
    if (req.method !== "POST") return reply(res, 405, { error: "Method not allowed" });

    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return reply(res, 403, { error: "Origin not allowed" });
    }
    if (req.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
      return reply(res, 415, { error: "Expected application/json" });
    }

    const auth = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "");
    if (!auth) return reply(res, 401, { error: "Authentication required" });

    let user;
    try {
      user = await verifyIdToken(auth[1]);
      if (!user || typeof user.uid !== "string" || !user.uid) throw new Error("Invalid UID");
    } catch {
      return reply(res, 401, { error: "Invalid authentication" });
    }

    const currentTime = now();
    const previous = usage.get(user.uid);
    const count = previous && currentTime - previous.start < windowMs ? previous.count : 0;
    if (count >= maxRequests) {
      return reply(res, 429, { error: "Too many requests. Try again later." });
    }
    usage.set(user.uid, { start: count ? previous.start : currentTime, count: count + 1 });
    if (usage.size > 1000) {
      for (const [uid, entry] of usage) {
        if (currentTime - entry.start >= windowMs) usage.delete(uid);
      }
    }

    try {
      const raw = await readJson(req);
      const input = parseChatInput(raw);
      if (!input) return reply(res, 400, { error: "Invalid chat input" });

      const answer = await generateReply(input);
      if (typeof answer !== "string" || !answer.trim()) {
        return reply(res, 502, { error: "The assistant is temporarily unavailable" });
      }
      return reply(res, 200, { answer: answer.trim() });
    } catch (error) {
      if (error.status === 400 || error.status === 413) {
        return reply(res, error.status, { error: error.message });
      }
      // Never print tokens, patient messages, AI inputs, or provider responses.
      return reply(res, 502, { error: "The assistant is temporarily unavailable" });
    }
  };
}
