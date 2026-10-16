"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Pause,
  Play,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  EQ_KEY,
  FREQUENCIES,
  PRESETS,
  clampGain,
  dbLabel,
  defaultEqualizer,
  frequencyLabel,
  nameError,
  readEqualizer,
  sameCurve,
} from "../lib/equalizer.mjs";
import {
  createEqualizerEngine,
  releaseEqualizerEngine,
} from "../lib/equalizer-audio.mjs";

type Preset = {
  id: string;
  name: string;
  description: string;
  gains: readonly number[];
};
type Settings = {
  version: number;
  enabled: boolean;
  gains: number[];
  presetId: string;
  personal: Preset[];
};
type Engine = Awaited<ReturnType<typeof createEqualizerEngine>>;

function BandNumber({
  gain,
  label,
  onChange,
}: {
  gain: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(gain));
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== input.current) setDraft(String(gain));
  }, [gain]);
  return (
    <input
      ref={input}
      type="number"
      aria-label={label}
      min={-12}
      max={12}
      step={0.5}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (text !== "" && Number.isFinite(Number(text)))
          onChange(Number(text));
      }}
      onBlur={() => setDraft(String(gain))}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.current?.blur();
        }
      }}
    />
  );
}

export default function Equalizer({
  audio,
  external,
  playing,
  onToggle,
}: {
  audio: HTMLAudioElement | null;
  external: boolean;
  playing: boolean;
  onToggle: () => void;
}) {
  const [settings, setSettings] = useState<Settings>(defaultEqualizer);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [compensation, setCompensation] = useState(0);
  const [limited, setLimited] = useState(false);
  const [editor, setEditor] = useState<
    "save" | "rename" | "delete" | "replace" | null
  >(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const panel = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const editorOpener = useRef<HTMLElement | null>(null);
  const settingsRef = useRef(settings);
  const engine = useRef<Engine | null>(null);
  const prepareRef = useRef<() => void>(() => {});
  const selected = [...PRESETS, ...settings.personal].find(
    (p) => p.id === settings.presetId,
  );
  const modified = !!selected && !sameCurve(settings.gains, selected.gains);
  const personal = settings.personal.find((p) => p.id === settings.presetId);
  const curveName = selected
    ? selected.name + (modified ? " · modifié" : "")
    : "Personnalisé";

  useEffect(() => {
    try {
      setSettings(readEqualizer(localStorage.getItem(EQ_KEY)));
    } catch {
      setStorageError(
        "Vos réglages ne peuvent pas être enregistrés sur cet appareil.",
      );
    }
    setReady(true);
    const media = matchMedia("(max-width: 700px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (!ready) return;
    try {
      localStorage.setItem(EQ_KEY, JSON.stringify(settings));
      setStorageError("");
    } catch {
      setStorageError(
        "Réglages actifs pour cette session, mais leur enregistrement a échoué.",
      );
    }
    if (engine.current) setCompensation(engine.current.apply(settings));
    if (settings.enabled) prepareRef.current();
    else setLimited(false);
  }, [settings, ready]);

  useEffect(() => {
    if (!audio || external) {
      setCompensation(0);
      return;
    }
    const controller = new AbortController();
    let pending = false;
    let failed = false;
    const prepare = () => {
      if (failed || controller.signal.aborted) return;
      if (engine.current) {
        void engine.current
          .resume()
          .then(() => setAudioError(""))
          .catch(() =>
            setAudioError("Relancez la lecture pour réactiver l’égaliseur."),
          );
        return;
      }
      if (!settingsRef.current.enabled || pending) return;
      // A restored preference must wait for a real gesture before creating a
      // context; otherwise a pending resume can stay locked by autoplay policy.
      if (navigator.userActivation?.hasBeenActive === false) return;
      pending = true;
      void createEqualizerEngine(audio, (meter: { limited: number }) => {
        if (!controller.signal.aborted) setLimited(meter.limited > 0);
      })
        .then((created) => {
          if (controller.signal.aborted) return;
          engine.current = created;
          setAudioError("");
          setCompensation(created.apply(settingsRef.current));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          failed = true;
          setAudioError(
            "Égaliseur indisponible dans cet environnement. L’écoute continue sans effet.",
          );
        })
        .finally(() => {
          pending = false;
        });
    };
    prepareRef.current = prepare;
    // Capture real gestures so a restored preference can unlock AudioContext.
    document.addEventListener("pointerdown", prepare, true);
    document.addEventListener("keydown", prepare, true);
    audio.addEventListener("play", prepare);
    if (!audio.paused) prepare();
    return () => {
      controller.abort();
      document.removeEventListener("pointerdown", prepare, true);
      document.removeEventListener("keydown", prepare, true);
      audio.removeEventListener("play", prepare);
      releaseEqualizerEngine(audio);
      engine.current = null;
      prepareRef.current = () => {};
    };
  }, [audio, external]);

  const close = useCallback(() => {
    setOpen(false);
    setEditor(null);
  }, []);
  useEffect(() => {
    const dialog = panel.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (dialog.open) dialog.close();
    if (mobile) dialog.showModal();
    else dialog.show();
    dialog.querySelector<HTMLElement>("[data-eq-close]")?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !mobile &&
        !dialog.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, mobile, close]);
  useEffect(() => {
    if (editor === "save" || editor === "rename") nameInput.current?.focus();
    else if (editor)
      panel.current
        ?.querySelector<HTMLElement>(".eq-confirm button:last-child")
        ?.focus();
  }, [editor]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open, mobile]);

  function changeBand(index: number, value: number) {
    setSettings((old) => ({
      ...old,
      gains: old.gains.map((g, i) => (i === index ? clampGain(value) : g)),
    }));
  }
  function cancelEditor() {
    setEditor(null);
    editorOpener.current?.focus();
  }
  function beginEditor(mode: "save" | "rename" | "delete" | "replace") {
    editorOpener.current = document.activeElement as HTMLElement;
    setFormError("");
    setName(mode === "rename" ? personal?.name || "" : "");
    setEditor(mode);
  }
  function submitName(event: React.FormEvent) {
    event.preventDefault();
    const error = nameError(
      name,
      settings.personal,
      editor === "rename" ? personal?.id : "",
    );
    if (error) {
      setFormError(error);
      return;
    }
    if (editor === "rename" && personal) {
      setSettings((old) => ({
        ...old,
        personal: old.personal.map((p) =>
          p.id === personal.id ? { ...p, name: name.trim() } : p,
        ),
      }));
      setAnnouncement("Preset renommé.");
    } else {
      const created: Preset = {
        id: "user:" + crypto.randomUUID(),
        name: name.trim(),
        description: "Votre réglage personnel.",
        gains: [...settings.gains],
      };
      setSettings((old) => ({
        ...old,
        presetId: created.id,
        personal: [...old.personal, created],
      }));
      setAnnouncement("Preset enregistré.");
    }
    setEditor(null);
    panel.current?.querySelector<HTMLSelectElement>("select")?.focus();
  }
  const unavailable = external
    ? "Égaliseur indisponible pour cet extrait. Il reste disponible pour vos morceaux importés."
    : audioError;
  const effective = settings.enabled && !unavailable;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`eq-trigger ${effective ? "is-active" : ""}`}
        aria-label={`Égaliseur : ${unavailable ? "indisponible pour cette écoute" : settings.enabled ? "activé" : "désactivé"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="equalizer-panel"
        onClick={() => setOpen((value) => !value)}
        disabled={!ready}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Égaliseur</span>
        {effective && <Check size={14} aria-hidden="true" />}
      </button>
      <dialog
        ref={panel}
        id="equalizer-panel"
        className="eq-panel"
        aria-labelledby="eq-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          if (!panel.current?.open) {
            setOpen(false);
            trigger.current?.focus({ preventScroll: true });
          }
        }}
        onKeyDown={(event) => {
          if (!mobile && event.key === "Tab") {
            const controls = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled),input:not(:disabled),select",
              ),
            ].filter((el) => el.getClientRects().length > 0);
            if (
              (event.shiftKey && event.target === controls[0]) ||
              (!event.shiftKey && event.target === controls.at(-1))
            )
              close();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (editor) cancelEditor();
            else close();
          }
        }}
      >
        <div className="eq-heading">
          <div>
            <span className="eq-eyebrow">VOTRE SON</span>
            <h2 id="eq-title">Égaliseur</h2>
          </div>
          <button
            type="button"
            className="eq-icon"
            aria-label="Fermer l’égaliseur"
            data-eq-close
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <div className="eq-content">
          <div className="eq-toggle-row">
            <label className="eq-switch">
              <input
                type="checkbox"
                role="switch"
                checked={settings.enabled}
                onChange={(event) =>
                  setSettings((old) => ({
                    ...old,
                    enabled: event.target.checked,
                  }))
                }
              />
              <span className="eq-switch-track" aria-hidden="true" />
              <span>Égaliseur {settings.enabled ? "activé" : "désactivé"}</span>
            </label>
            {mobile && (
              <button
                className="eq-listen"
                type="button"
                disabled={!audio?.src}
                onClick={onToggle}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
                {playing ? "Pause" : "Écouter"}
              </button>
            )}
          </div>
          <p className="eq-status" role="status">
            {unavailable ||
              (!settings.enabled
                ? "Activez pour écouter ce réglage."
                : "Le réglage s’applique à tous vos morceaux.")}
          </p>
          <label className="eq-label" htmlFor="eq-preset">
            Preset
          </label>
          <select
            id="eq-preset"
            value={settings.presetId || "custom"}
            onChange={(event) => {
              const next = [...PRESETS, ...settings.personal].find(
                (p) => p.id === event.target.value,
              );
              if (next)
                setSettings((old) => ({
                  ...old,
                  presetId: next.id,
                  gains: [...next.gains],
                }));
              setEditor(null);
            }}
          >
            {!selected && <option value="custom">Personnalisé</option>}
            <optgroup label="Presets MyLib">
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === selected?.id && modified ? " · modifié" : ""}
                </option>
              ))}
            </optgroup>
            {settings.personal.length > 0 && (
              <optgroup label="Vos presets">
                {settings.personal.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === selected?.id && modified ? " · modifié" : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="eq-description">
            {selected?.description || "Votre courbe personnalisée."} Un point de
            départ, à adapter à votre écoute.
          </p>
          <button
            type="button"
            className="eq-disclosure"
            aria-expanded={advanced}
            aria-controls="eq-bands"
            onClick={() => setAdvanced((value) => !value)}
          >
            <span>
              Réglage personnalisé <small>10 bandes</small>
            </span>
            <ChevronDown size={18} className={advanced ? "rotated" : ""} />
          </button>
          <section
            id="eq-bands"
            hidden={!advanced}
            aria-label="Réglages des fréquences"
          >
            <div className="eq-band-groups" aria-hidden="true">
              <span>Graves</span>
              <span>Médiums</span>
              <span>Aigus</span>
            </div>
            <div className="eq-bands">
              {FREQUENCIES.map((frequency, index) => (
                <div className="eq-band" key={frequency}>
                  <label htmlFor={`eq-band-${index}`}>
                    {frequencyLabel(frequency)}
                  </label>
                  <input
                    id={`eq-band-${index}`}
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={settings.gains[index]}
                    aria-valuetext={dbLabel(settings.gains[index])}
                    onChange={(event) =>
                      changeBand(index, Number(event.target.value))
                    }
                  />
                  <div className="eq-number">
                    <BandNumber
                      gain={settings.gains[index]}
                      label={`Gain à ${frequencyLabel(frequency)} en dB`}
                      onChange={(value) => changeBand(index, value)}
                    />
                    <span>dB</span>
                  </div>
                  <button
                    type="button"
                    className="eq-zero"
                    aria-label={`Remettre ${frequencyLabel(frequency)} à zéro`}
                    onClick={() => changeBand(index, 0)}
                  >
                    0
                  </button>
                </div>
              ))}
            </div>
            <p className="eq-help">
              De −12 à +12 dB · 0 dB conserve le niveau d’origine.
            </p>
          </section>
          {effective && compensation < 0 && (
            <p className="eq-level">
              Niveau ajusté pour limiter la saturation (
              {dbLabel(Math.round(compensation * 10) / 10)}).
            </p>
          )}
          {effective && limited && (
            <p className="eq-level" role="status">
              Protection des crêtes active. Réduisez les bandes accentuées pour
              un rendu plus naturel.
            </p>
          )}
          <div className="eq-actions">
            <button
              className="primary"
              type="button"
              onClick={() => beginEditor("save")}
            >
              Enregistrer sous…
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setSettings((old) => ({
                  ...old,
                  gains: Array(10).fill(0),
                  presetId: "flat",
                }));
                setEditor(null);
                setAnnouncement("Toutes les bandes sont à zéro.");
              }}
            >
              Remettre à plat
            </button>
          </div>
          {personal && (
            <div className="eq-personal-actions">
              {modified && (
                <button type="button" onClick={() => beginEditor("replace")}>
                  Remplacer « {personal.name} »
                </button>
              )}
              <button type="button" onClick={() => beginEditor("rename")}>
                Renommer
              </button>
              <button type="button" onClick={() => beginEditor("delete")}>
                Supprimer ce preset
              </button>
            </div>
          )}
          {(editor === "save" || editor === "rename") && (
            <form className="eq-editor" onSubmit={submitName}>
              <label className="eq-label" htmlFor="eq-name">
                {editor === "rename" ? "Nouveau nom" : "Nom du nouveau preset"}
              </label>
              <input
                ref={nameInput}
                id="eq-name"
                value={name}
                maxLength={60}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                aria-invalid={!!formError}
                aria-describedby={formError ? "eq-name-error" : undefined}
              />
              {formError && (
                <p id="eq-name-error" className="eq-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="eq-actions">
                <button className="primary" type="submit">
                  {editor === "rename" ? "Renommer" : "Enregistrer"}
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={cancelEditor}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
          {editor === "replace" && personal && (
            <div className="eq-editor eq-confirm">
              <p>
                Remplacer les réglages de « {personal.name} » par la courbe
                actuelle ?
              </p>
              <div className="eq-actions">
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    setSettings((old) => ({
                      ...old,
                      personal: old.personal.map((p) =>
                        p.id === personal.id
                          ? { ...p, gains: [...old.gains] }
                          : p,
                      ),
                    }));
                    setEditor(null);
                    setAnnouncement(
                      "Preset remplacé par votre réglage actuel.",
                    );
                    panel.current
                      ?.querySelector<HTMLSelectElement>("select")
                      ?.focus();
                  }}
                >
                  Confirmer le remplacement
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={cancelEditor}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {editor === "delete" && personal && (
            <div className="eq-editor eq-confirm">
              <p>
                Supprimer « {personal.name} » ? Votre réglage sonore actuel sera
                conservé.
              </p>
              <div className="eq-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSettings((old) => ({
                      ...old,
                      presetId: "",
                      personal: old.personal.filter(
                        (p) => p.id !== personal.id,
                      ),
                    }));
                    setEditor(null);
                    setAnnouncement(
                      "Preset supprimé. Réglage actuel conservé.",
                    );
                    panel.current
                      ?.querySelector<HTMLSelectElement>("select")
                      ?.focus();
                  }}
                >
                  Confirmer la suppression
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={cancelEditor}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {storageError && (
            <p className="eq-error" role="alert">
              {storageError}
            </p>
          )}
          <p className="sr-only" role="status">
            {announcement}
          </p>
          <p className="eq-footnote">
            Fermer ce panneau conserve votre réglage. Les fichiers originaux
            restent intacts.
          </p>
          <span className="sr-only">Réglage actuel : {curveName}</span>
        </div>
      </dialog>
    </>
  );
}
