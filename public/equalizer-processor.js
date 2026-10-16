// Final sample-peak safety net. Headroom upstream does the normal level control.
// No lookahead or compressor is claimed: extreme settings can trigger soft clipping.
class EqualizerSafety extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "enabled",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }
  constructor() {
    super();
    this.peak = 0;
    this.limited = 0;
    this.frames = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0],
      output = outputs[0];
    const enabled = parameters.enabled[0] > 0.5;
    for (let c = 0; c < output.length; c++) {
      const src = input[c];
      if (!src) {
        output[c].fill(0);
        continue;
      }
      for (let i = 0; i < src.length; i++) {
        const value = Number.isFinite(src[i]) ? src[i] : 0;
        this.peak = Math.max(this.peak, Math.abs(value));
        if (enabled && Math.abs(value) > 0.95) this.limited++;
        // Soft knee begins at .95 and asymptotically approaches .99.
        output[c][i] =
          enabled && Math.abs(value) > 0.95
            ? Math.sign(value) *
              (0.95 + 0.04 * Math.tanh((Math.abs(value) - 0.95) / 0.04))
            : value;
      }
    }
    this.frames += output[0]?.length || 128;
    if (this.frames >= sampleRate) {
      this.port.postMessage({ peak: this.peak, limited: this.limited });
      this.frames = 0;
      this.peak = 0;
      this.limited = 0;
    }
    return true;
  }
}
registerProcessor("mylib-equalizer-safety", EqualizerSafety);
