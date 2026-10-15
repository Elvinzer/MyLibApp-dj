import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { selectionTempo } from "../lib/tempo.mjs";
test("selection tempo follows each passage and rejects short/silent regions", () => {
  const points = Array.from({ length: 60 }, (_, i) => [
    i + 0.5,
    i < 30 ? 120 : 140,
    0.8,
  ]);
  assert.equal(selectionTempo(points, 0, 25).bpm, 120);
  assert.equal(selectionTempo(points, 35, 60).bpm, 140);
  assert.equal(selectionTempo(points, 0, 3).bpm, null);
  assert.equal(selectionTempo([], 0, 20).bpm, null);
  assert.equal(selectionTempo(points, 0, 25, 0.5).bpm, 60);
  assert.equal(selectionTempo(points, 0, 60).quality, "Tempo variable");
});
test("two-hour local index aggregation p95 below 200 ms", () => {
  const points = Array.from({ length: 7200 }, (_, i) => [
    i + 0.5,
    i < 3600 ? 120 : 140,
    0.8,
  ]);
  const times = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    selectionTempo(points, i, i + 120);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log("Selection aggregate p95:", times[950].toFixed(3), "ms");
  assert.ok(times[950] < 200);
});
