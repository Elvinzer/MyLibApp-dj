// Pure local aggregation: no network or audio decoding while a handle moves.
export function selectionTempo(points, start, end, factor = 1) {
  if (end - start < 8)
    return { bpm: null, quality: "Plage trop courte", span: null };
  let sum = 0,
    weight = 0,
    confidence = 0;
  const values = [];
  for (const [time, bpm, score] of points) {
    if (time < start || time > end || bpm === null) continue;
    const w = Math.max(
      0,
      Math.min(end, time + 0.5) - Math.max(start, time - 0.5),
    );
    sum += bpm * w;
    weight += w;
    confidence += score * w;
    values.push(bpm);
  }
  if (!weight || weight / (end - start) < 0.3)
    return { bpm: null, quality: "Rythme incertain", span: null };
  values.sort((a, b) => a - b);
  const span = [
    values[Math.floor(values.length * 0.1)] * factor,
    values[Math.min(values.length - 1, Math.floor(values.length * 0.9))] *
      factor,
  ];
  return {
    bpm: (sum / weight) * factor,
    span,
    quality:
      span[1] - span[0] > 5
        ? "Tempo variable"
        : confidence / weight > 0.35
          ? "Tempo stable"
          : "Estimation incertaine",
  };
}
export function formatTime(seconds = 0) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
