import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createChatHandler } from "./chat-handler.mjs";

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

const makeHandler = () => createChatHandler({
  verifyIdToken: async token => {
    if (token !== "valid-token") throw new Error("Invalid");
    return { uid: "demo-user" };
  },
  generateReply: async () => "Demo reply",
});

test("health check does not reveal secrets", async () => {
  await withServer(makeHandler(), async base => {
    const response = await fetch(base + "/api/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("chat rejects requests without authentication", async () => {
  await withServer(makeHandler(), async base => {
    const response = await fetch(base + "/api/chat", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Hi", history: [] }),
    });
    assert.equal(response.status, 401);
  });
});

test("chat rejects invalid data and disallowed origins", async () => {
  await withServer(makeHandler(), async base => {
    const headers = { authorization: "Bearer valid-token", "content-type": "application/json" };
    const invalid = await fetch(base + "/api/chat", {
      method: "POST", headers, body: JSON.stringify({ message: "", history: [] }),
    });
    assert.equal(invalid.status, 400);
    const forbidden = await fetch(base + "/api/chat", {
      method: "POST", headers: { ...headers, origin: "https://other.example" },
      body: JSON.stringify({ message: "Hi", history: [] }),
    });
    assert.equal(forbidden.status, 403);
  });
});

test("chat returns reply with valid identity", async () => {
  await withServer(makeHandler(), async base => {
    const response = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
      body: JSON.stringify({ message: "Hello", history: [] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { answer: "Demo reply" });
  });
});

test("rate limit is enforced per authenticated user", async () => {
  await withServer(createChatHandler({
    verifyIdToken: async () => ({ uid: "u" }),
    generateReply: async () => "ok",
    maxRequests: 1,
  }), async base => {
    const options = {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ message: "Hi", history: [] }),
    };
    assert.equal((await fetch(base + "/api/chat", options)).status, 200);
    assert.equal((await fetch(base + "/api/chat", options)).status, 429);
  });
});
