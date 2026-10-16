export const EQ_KEY = "mylib-equalizer-v1";
export const FREQUENCIES = Object.freeze([
  31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
]);
const preset = (id, name, description, gains) =>
  Object.freeze({ id, name, description, gains: Object.freeze(gains) });
// Deliberately modest curves: genre names are starting points, not mastering corrections.
export const PRESETS = Object.freeze([
  preset(
    "flat",
    "Neutre",
    "Le son d’origine, sans accentuation.",
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ),
  preset(
    "rock",
    "Rock",
    "De la présence pour les guitares et la batterie.",
    [1, 2, 1, 0, -1, 0, 1.5, 2, 1, 0],
  ),
  preset(
    "techno",
    "Techno",
    "Une assise plus profonde et une attaque précise.",
    [2, 3, 2, 0, -1, -1, 0, 1, 1.5, 0.5],
  ),
  preset(
    "house",
    "House",
    "Des basses rondes et des voix présentes.",
    [1, 2.5, 2, 0.5, -0.5, 0, 1, 1, 0.5, 0],
  ),
  preset(
    "hiphop",
    "Hip-hop",
    "Du poids dans le grave, des voix lisibles.",
    [2.5, 3, 1.5, 0, -1, 0, 1.5, 1, 0, 0],
  ),
  preset(
    "pop",
    "Pop",
    "Des voix en avant et une touche de clarté.",
    [0.5, 1, 0, -0.5, 0, 1, 1.5, 1, 1, 0],
  ),
  preset(
    "voice",
    "Voix",
    "Moins de grave, plus de présence vocale.",
    [-3, -2, -1, 0, 0.5, 1.5, 2, 1, -0.5, -1],
  ),
  preset(
    "bass-up",
    "Basses renforcées",
    "Plus de profondeur dans les basses.",
    [3, 3, 2, 1, 0, 0, 0, 0, 0, 0],
  ),
  preset(
    "bass-down",
    "Basses réduites",
    "Un grave plus discret et plus léger.",
    [-4, -3, -2, -1, 0, 0, 0, 0, 0, 0],
  ),
  preset(
    "soft-highs",
    "Aigus adoucis",
    "Un rendu moins brillant dans le haut du spectre.",
    [0, 0, 0, 0, 0, 0, -0.5, -1.5, -3, -4],
  ),
]);
export const defaultEqualizer = () => ({
  version: 1,
  enabled: false,
  gains: Array(10).fill(0),
  presetId: "flat",
  personal: [],
});
export const clampGain = (value) =>
  Math.round(
    Math.max(
      -12,
      Math.min(12, Number.isFinite(Number(value)) ? Number(value) : 0),
    ) * 2,
  ) / 2;
export const sameCurve = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
export const frequencyLabel = (value) =>
  value >= 1000
    ? `${value / 1000} kHz`
    : `${String(value).replace(".", ",")} Hz`;
export const dbLabel = (value) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("fr-FR")} dB`;
const normalizedName = (name) =>
  name.trim().normalize("NFKC").toLocaleLowerCase("fr");
export function nameError(name, personal, exceptId = "") {
  if (!name.trim()) return "Donnez un nom à ce preset.";
  if (name.trim().length > 60) return "Utilisez 60 caractères maximum.";
  if (
    [...PRESETS, ...personal].some(
      (p) =>
        p.id !== exceptId && normalizedName(p.name) === normalizedName(name),
    )
  )
    return "Ce nom est déjà utilisé. Choisissez un autre nom.";
  return "";
}
export function readEqualizer(raw) {
  const fallback = defaultEqualizer();
  try {
    const data = JSON.parse(raw);
    if (
      data?.version !== 1 ||
      !Array.isArray(data.gains) ||
      data.gains.length !== 10
    )
      return fallback;
    const personal = [];
    for (const p of Array.isArray(data.personal)
      ? data.personal.slice(0, 100)
      : []) {
      if (
        typeof p?.id !== "string" ||
        !p.id.startsWith("user:") ||
        typeof p.name !== "string" ||
        !Array.isArray(p.gains) ||
        p.gains.length !== 10 ||
        personal.some((x) => x.id === p.id) ||
        nameError(p.name, personal)
      )
        continue;
      personal.push({
        id: p.id,
        name: p.name.trim(),
        description: "Votre réglage personnel.",
        gains: p.gains.map(clampGain),
      });
    }
    return {
      version: 1,
      enabled: data.enabled === true,
      gains: data.gains.map(clampGain),
      presetId: [...PRESETS, ...personal].some((p) => p.id === data.presetId)
        ? data.presetId
        : "",
      personal,
    };
  } catch {
    return fallback;
  }
}
