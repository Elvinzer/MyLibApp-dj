import { FREQUENCIES } from "./equalizer.mjs";

export function configureFilters(context, gains) {
  return FREQUENCIES.map((frequency, i) => {
    const filter = context.createBiquadFilter();
    filter.type = i === 0 ? "lowshelf" : i === 9 ? "highshelf" : "peaking";
    filter.frequency.value = Math.min(frequency, context.sampleRate * 0.45);
    filter.Q.value = 1.4;
    filter.gain.value = gains[i];
    return filter;
  });
}

export function compensationDb(context, gains) {
  if (gains.every((g) => g === 0)) return 0;
  // Evaluate the combined response, rather than the largest individual slider.
  const filters = configureFilters(context, gains);
  const frequencies = Float32Array.from(
    { length: 1024 },
    (_, i) =>
      20 * (Math.min(22000, context.sampleRate * 0.49) / 20) ** (i / 1023),
  );
  const combined = new Float64Array(1024).fill(1),
    magnitude = new Float32Array(1024),
    phase = new Float32Array(1024);
  for (const filter of filters) {
    filter.getFrequencyResponse(frequencies, magnitude, phase);
    for (let i = 0; i < 1024; i++) combined[i] *= magnitude[i];
    filter.disconnect();
  }
  const maximum = Math.max(...combined);
  return -(Math.max(0, 20 * Math.log10(maximum)) + 3);
}

// Construct everything that can fail before rerouting the media element.
async function buildEqualizerEngine(audio, onMeter) {
  // Keep the advertised 16 kHz band below Nyquist even on 24 kHz devices.
  const context = new AudioContext({ sampleRate: 48000 });
  try {
    const resume = context.resume();
    await context.audioWorklet.addModule("/equalizer-processor.js");
    await resume;
    const filters = configureFilters(context, Array(10).fill(0));
    const gain = context.createGain();
    const safety = new AudioWorkletNode(context, "mylib-equalizer-safety");
    safety.port.onmessage = (event) => onMeter(event.data);
    gain.connect(filters[0]);
    for (let i = 1; i < filters.length; i++) filters[i - 1].connect(filters[i]);
    filters.at(-1).connect(safety).connect(context.destination);
    const source = context.createMediaElementSource(audio);
    source.connect(gain);
    let lastGains = Array(10).fill(0),
      lastCompensation = 0;
    return {
      context,
      apply(settings) {
        const gains = settings.enabled ? settings.gains : Array(10).fill(0);
        const compensation = settings.enabled
          ? compensationDb(context, gains)
          : 0;
        const now = context.currentTime;
        const ramp = (param, value, end) => {
          param.cancelAndHoldAtTime(now);
          param.linearRampToValueAtTime(value, now + end);
        };
        // Attenuate before boosting; release headroom after filters settle.
        ramp(
          gain.gain,
          10 ** (Math.min(lastCompensation, compensation) / 20),
          0.012,
        );
        gain.gain.linearRampToValueAtTime(
          10 ** (compensation / 20),
          now + 0.12,
        );
        for (let i = 0; i < 10; i++) ramp(filters[i].gain, gains[i], 0.06);
        const protection = safety.parameters.get("enabled");
        protection.cancelScheduledValues(now);
        protection.setValueAtTime(
          settings.enabled ? 1 : 0,
          settings.enabled ? now : now + 0.13,
        );
        lastGains = [...gains];
        lastCompensation = compensation;
        return compensation;
      },
      async resume() {
        if (context.state !== "running" && context.state !== "closed")
          await context.resume();
      },
      dispose() {
        safety.port.onmessage = null;
        source.disconnect();
        gain.disconnect();
        filters.forEach((f) => f.disconnect());
        safety.disconnect();
        void context.close();
      },
      inspect() {
        return {
          gains: lastGains,
          compensation: lastCompensation,
          state: context.state,
          sampleRate: context.sampleRate,
          protected: safety.parameters.get("enabled").value === 1,
        };
      },
    };
  } catch (error) {
    void context.close();
    throw error;
  }
}

// React may replay effects for the same DOM element. Keep its one permitted
// MediaElementSource alive until that element actually leaves the document.
const engines = new WeakMap();
/** @returns {ReturnType<typeof buildEqualizerEngine>} */
export function createEqualizerEngine(audio, onMeter) {
  let record = engines.get(audio);
  if (!record) {
    record = { onMeter, promise: null };
    record.promise = buildEqualizerEngine(audio, (meter) =>
      record.onMeter(meter),
    );
    engines.set(audio, record);
    record.promise.catch(() => {
      if (engines.get(audio) === record) engines.delete(audio);
    });
  }
  record.onMeter = onMeter;
  return record.promise;
}
export function releaseEqualizerEngine(audio) {
  queueMicrotask(() => {
    if (audio.isConnected) return;
    const record = engines.get(audio);
    if (!record) return;
    engines.delete(audio);
    record.onMeter = () => {};
    void record.promise.then((engine) => engine.dispose()).catch(() => {});
  });
}
