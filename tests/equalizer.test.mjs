import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  PRESETS,
  defaultEqualizer,
  readEqualizer,
  nameError,
  clampGain,
} from "../lib/equalizer.mjs";

test("preference restoration rejects corrupt versions and clamps untrusted curves", () => {
  assert.deepEqual(readEqualizer("{"), defaultEqualizer());
  assert.deepEqual(
    readEqualizer(JSON.stringify({ version: 2, gains: Array(10).fill(3) })),
    defaultEqualizer(),
  );
  const restored = readEqualizer(
    JSON.stringify({
      version: 1,
      enabled: "true",
      presetId: "missing",
      gains: [99, -99, null, "NaN", Infinity, 0.3, 1, 2, 3, 4],
      personal: [
        { id: "user:a", name: " Test ", gains: Array(10).fill(1) },
        { id: "user:b", name: "TEST", gains: Array(10).fill(2) },
        { id: "flat", name: "Override", gains: Array(10).fill(12) },
      ],
    }),
  );
  assert.equal(restored.enabled, false);
  assert.equal(restored.presetId, "");
  assert.deepEqual(restored.gains, [12, -12, 0, 0, 0, 0.5, 1, 2, 3, 4]);
  assert.equal(restored.personal.length, 1);
  assert.equal(restored.personal[0].name, "Test");
  assert.equal(clampGain(-0.4), -0.5);
});
test("names cannot shadow stock or personal presets but can retain identity on rename", () => {
  assert.ok(nameError("  ROCK ", []));
  assert.ok(nameError("", []));
  const saved = [{ id: "user:a", name: "Mon son" }];
  assert.ok(nameError("mon son", saved));
  assert.equal(nameError("Mon son", saved, "user:a"), "");
  assert.equal(PRESETS.length, 10);
  assert.ok(Object.isFrozen(PRESETS[1].gains));
});
test("real AudioWorklet processor bounds peaks and preserves disabled samples", () => {
  let Processor;
  const messages = [];
  const sandbox = {
    AudioWorkletProcessor: class {
      port = { postMessage: (m) => messages.push(m) };
    },
    registerProcessor: (_, p) => (Processor = p),
    sampleRate: 48000,
  };
  vm.runInNewContext(
    readFileSync(
      new URL("../public/equalizer-processor.js", import.meta.url),
      "utf8",
    ),
    sandbox,
  );
  const p = new Processor();
  const values = Float32Array.from([0, 0.5, 0.95, 1, 2, -5, NaN]);
  const out = new Float32Array(values.length);
  p.process([[values]], [[out]], { enabled: [1] });
  assert.ok(out.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.990001));
  assert.equal(out[1], 0.5);
  p.process([[values]], [[out]], { enabled: [0] });
  assert.equal(out[4], 2);
  assert.equal(out[5], -5);
  assert.equal(out[6], 0);
  for (let i = 0; i < 400; i++)
    p.process([[new Float32Array(128).fill(2)]], [[new Float32Array(128)]], {
      enabled: [1],
    });
  assert.ok(messages.some((m) => m.limited > 0 && m.peak === 5));
});
