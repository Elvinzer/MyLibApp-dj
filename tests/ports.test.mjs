import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { freePort } from "../scripts/ports.mjs";
test("a busy port selects a free loopback port without stopping its owner", async () => {
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  try {
    const busy = blocker.address().port;
    const port = await freePort(busy);
    assert.notEqual(port, busy);
    assert.ok(blocker.listening);
    const check = createServer();
    await new Promise((resolve) => check.listen(port, "127.0.0.1", resolve));
    await new Promise((resolve) => check.close(resolve));
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});
